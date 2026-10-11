import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventsService } from '../kafka/events.service';
import { KafkaTopic } from '../kafka/kafka.constants';
import { BankAccount } from '../drivers/entities/bank-account.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { PaymentGatewayService } from '../payment-methods/payment-gateway.service';
import { PaymentMethod } from '../payment-methods/entity/payment-method.entity';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { DriverEarning, DriverEarningStatus } from './entities/driver-earning.entity';
import { DriverPayout, DriverPayoutStatus } from './entities/driver-payout.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

const paiseFromRupees = (rupees: number): number => Math.round(rupees * 100);
const toBigInt = (amount: string | number | null | undefined): bigint =>
  BigInt(amount ?? 0);
const rupeesFromPaise = (paise: bigint): string => {
  const sign = paise < 0n ? '-' : '';
  const absolute = paise < 0n ? -paise : paise;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(DriverEarning)
    private readonly earningRepository: Repository<DriverEarning>,
    @InjectRepository(DriverPayout)
    private readonly payoutRepository: Repository<DriverPayout>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gateway: PaymentGatewayService,
    private readonly eventsService: EventsService,
    private readonly realtimeService: RealtimeService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /** Create one server-owned Razorpay Order for a completed ride. Checkout is user-confirmed. */
  async processRidePayment(rideId: string) {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['fare'],
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Only completed rides can be charged');
    }
    if (!ride.driverId) {
      throw new BadRequestException('Completed ride has no assigned driver');
    }

    let payment = await this.paymentRepository.findOne({ where: { rideId } });
    if (payment?.status === PaymentStatus.COMPLETED) {
      return this.toPublicPayment(payment);
    }
    if (payment?.status === PaymentStatus.PENDING && payment.gatewayOrderId) {
      return this.toPublicPayment(payment, true);
    }

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { userId: ride.riderId, isDefault: true },
    });
    const amount = ride.fare?.actualTotal ?? ride.fare?.estimatedTotal;
    const amountPaise = amount == null ? 0 : paiseFromRupees(amount);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('Ride fare is invalid');
    }

    if (!payment) {
      payment = this.paymentRepository.create({
        rideId,
        userId: ride.riderId,
        paymentMethodId: paymentMethod?.id ?? null,
        gateway: 'razorpay',
        amountPaise: String(amountPaise),
        currency: 'INR',
        status: PaymentStatus.PENDING,
        gatewayOrderId: null,
        gatewayPaymentId: null,
        failureReason: null,
      });
      payment = await this.paymentRepository.save(payment);
    } else {
      payment.paymentMethodId = paymentMethod?.id ?? null;
      payment.amountPaise = String(amountPaise);
      payment.status = PaymentStatus.PENDING;
      payment.gatewayOrderId = null;
      payment.failureReason = null;
      payment = await this.paymentRepository.save(payment);
    }

    if (!paymentMethod) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'No default payment method is configured';
      await this.paymentRepository.save(payment);
      this.realtimeService.emitToUser(ride.riderId, 'payment:failed', {
        rideId,
        message: 'Add a payment method to pay for this ride.',
      });
      return this.toPublicPayment(payment);
    }
    if (paymentMethod.gateway !== 'razorpay') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = `Unsupported payment gateway: ${paymentMethod.gateway}`;
      await this.paymentRepository.save(payment);
      this.realtimeService.emitToUser(ride.riderId, 'payment:failed', {
        rideId,
        message: 'This payment method cannot be used for this ride.',
      });
      return this.toPublicPayment(payment);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const order = await this.gateway.createOrder({
          amountPaise,
          receipt: `ride_${rideId}`,
          notes: { ride_id: rideId, payment_id: payment.id },
        });
        payment.gatewayOrderId = order.id;
        payment.failureReason = null;
        payment.status = PaymentStatus.PENDING;
        await this.paymentRepository.save(payment);
        const publicPayment = this.toPublicPayment(payment, true);
        this.realtimeService.emitToUser(
          ride.riderId,
          'payment:checkout_ready',
          publicPayment,
        );
        return publicPayment;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Razorpay order attempt ${attempt + 1} failed for ride ${rideId}: ${(error as Error).message}`,
        );
      }
    }

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = this.safeFailureReason(lastError);
    await this.paymentRepository.save(payment);
    this.realtimeService.emitToUser(ride.riderId, 'payment:failed', {
      rideId,
      message: 'Payment could not be started. Please retry from your ride history.',
    });
    return this.toPublicPayment(payment);
  }

  async confirmRidePayment(
    userId: string,
    rideId: string,
    dto: ConfirmPaymentDto,
  ) {
    if (
      !dto ||
      typeof dto.razorpay_order_id !== 'string' ||
      typeof dto.razorpay_payment_id !== 'string' ||
      typeof dto.razorpay_signature !== 'string' ||
      dto.razorpay_order_id.length > 80 ||
      dto.razorpay_payment_id.length > 80 ||
      dto.razorpay_signature.length !== 64
    ) {
      throw new BadRequestException('Invalid Razorpay confirmation payload');
    }
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride || ride.riderId !== userId) {
      throw new NotFoundException('Ride payment not found');
    }
    const payment = await this.paymentRepository.findOne({ where: { rideId } });
    if (!payment || !payment.gatewayOrderId) {
      throw new NotFoundException('Payment checkout has not been created');
    }
    if (payment.status === PaymentStatus.COMPLETED) {
      if (payment.gatewayPaymentId !== dto.razorpay_payment_id) {
        throw new BadRequestException('Ride has already been paid');
      }
      return this.toPublicPayment(payment);
    }
    if (dto.razorpay_order_id !== payment.gatewayOrderId) {
      throw new BadRequestException('Payment order does not match this ride');
    }
    if (
      !this.gateway.verifyCheckoutSignature(
        payment.gatewayOrderId,
        dto.razorpay_payment_id,
        dto.razorpay_signature,
      )
    ) {
      throw new BadRequestException('Payment signature is invalid');
    }

    let gatewayPayment = await this.gateway.fetchPayment(dto.razorpay_payment_id);
    if (
      gatewayPayment.order_id !== payment.gatewayOrderId ||
      gatewayPayment.amount !== Number(payment.amountPaise) ||
      gatewayPayment.currency !== 'INR'
    ) {
      throw new BadRequestException('Gateway payment does not match this ride');
    }
    if (gatewayPayment.status === 'authorized') {
      gatewayPayment = await this.gateway.capturePayment(
        dto.razorpay_payment_id,
        Number(payment.amountPaise),
      );
    }
    if (gatewayPayment.status === 'failed') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Gateway reported that the checkout payment failed';
      await this.paymentRepository.save(payment);
      this.realtimeService.emitToUser(userId, 'payment:failed', {
        rideId,
        message: 'Payment was declined. You can retry with another payment method.',
      });
      throw new BadRequestException('Payment was declined');
    }
    if (gatewayPayment.status !== 'captured' && gatewayPayment.captured !== true) {
      throw new BadRequestException('Payment has not been captured');
    }

    const completed = await this.dataSource.transaction(async (manager) => {
      const lockedPayment = await manager.findOne(Payment, {
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedPayment) throw new NotFoundException('Payment not found');
      if (lockedPayment.status === PaymentStatus.COMPLETED) return lockedPayment;

      const lockedRide = await manager.findOne(Ride, {
        where: { id: rideId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!lockedRide?.driverId) {
        throw new BadRequestException('Ride has no assigned driver');
      }

      let earning = await manager.findOne(DriverEarning, { where: { rideId } });
      if (!earning) {
        const commissionBps = Number(
          this.configService.get<string>('DRIVER_COMMISSION_BPS', '2000'),
        );
        if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
          throw new BadRequestException('DRIVER_COMMISSION_BPS must be between 0 and 10000');
        }
        const gross = toBigInt(lockedPayment.amountPaise);
        const commission = (gross * BigInt(commissionBps) + 5_000n) / 10_000n;
        earning = manager.create(DriverEarning, {
          rideId,
          driverId: lockedRide.driverId,
          paymentId: lockedPayment.id,
          payoutId: null,
          grossAmountPaise: String(gross),
          commissionAmountPaise: String(commission),
          netAmountPaise: String(gross - commission),
          status: DriverEarningStatus.UNPAID,
        });
        await manager.save(earning);
      }

      const driver = await manager.findOne(Driver, {
        where: { id: lockedRide.driverId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!driver) throw new NotFoundException('Driver not found');
      const oldTotalPaise = BigInt(paiseFromRupees(Number(driver.totalEarnings ?? 0)));
      driver.totalEarnings = rupeesFromPaise(
        oldTotalPaise + toBigInt(earning.netAmountPaise),
      );
      await manager.save(driver);

      lockedPayment.status = PaymentStatus.COMPLETED;
      lockedPayment.gatewayPaymentId = dto.razorpay_payment_id;
      lockedPayment.failureReason = null;
      return manager.save(lockedPayment);
    });

    await this.eventsService.emit(KafkaTopic.PAYMENT_COMPLETED, {
      rideId,
      paymentId: completed.id,
      riderId: userId,
      driverId: ride.driverId,
      amountPaise: completed.amountPaise,
      status: completed.status,
    });
    this.realtimeService.emitToUser(userId, 'payment:receipt', {
      rideId,
      paymentId: completed.id,
      amountPaise: completed.amountPaise,
      currency: completed.currency,
      status: completed.status,
    });
    return this.toPublicPayment(completed);
  }

  async retryRidePayment(userId: string, rideId: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride || ride.riderId !== userId) {
      throw new NotFoundException('Ride payment not found');
    }
    const payment = await this.paymentRepository.findOne({ where: { rideId } });
    if (payment?.status === PaymentStatus.COMPLETED) {
      return this.toPublicPayment(payment);
    }
    if (payment?.status === PaymentStatus.PENDING && payment.gatewayOrderId) {
      return this.toPublicPayment(payment, true);
    }
    return this.processRidePayment(rideId);
  }

  async getRidePayment(userId: string, rideId: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride || ride.riderId !== userId) {
      throw new NotFoundException('Ride payment not found');
    }
    const payment = await this.paymentRepository.findOne({ where: { rideId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.toPublicPayment(payment, payment.status === PaymentStatus.PENDING);
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const pagination = this.pagination(page, limit);
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: payments.map((payment) => this.toPublicPayment(payment)),
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getEarningsSummary(userId: string) {
    const driver = await this.driverRepository.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const thisWeek = new Date(today.getTime() - mondayOffset * 86_400_000);
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const earnings = await this.earningRepository.find({
      where: { driverId: driver.id },
      order: { createdAt: 'DESC' },
    });
    const sumSince = (start: Date) =>
      earnings
        .filter((earning) => earning.createdAt >= start)
        .reduce((total, earning) => total + toBigInt(earning.netAmountPaise), 0n);
    return {
      today: rupeesFromPaise(sumSince(today)),
      thisWeek: rupeesFromPaise(sumSince(thisWeek)),
      thisMonth: rupeesFromPaise(sumSince(thisMonth)),
      currency: 'INR',
    };
  }

  async getEarningsBreakdown(userId: string, page = 1, limit = 20) {
    const driver = await this.driverRepository.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    const pagination = this.pagination(page, limit);
    const query = this.earningRepository
      .createQueryBuilder('earning')
      .leftJoinAndSelect('earning.ride', 'ride')
      .where('earning.driver_id = :driverId', { driverId: driver.id })
      .orderBy('earning.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);
    const [items, total] = await Promise.all([query.getMany(), query.getCount()]);
    return {
      items,
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /** Weekly job. A PostgreSQL advisory lock prevents duplicate payouts across API instances. */
  async runWeeklyPayouts(): Promise<void> {
    const lockRunner = this.dataSource.createQueryRunner();
    let lockResult: Array<{ locked: boolean }>;
    try {
      await lockRunner.connect();
      lockResult = await lockRunner.query(
        `SELECT pg_try_advisory_lock(hashtext('transit:weekly-driver-payouts')) AS locked`,
      );
    } catch (error) {
      await lockRunner.release();
      throw error;
    }
    if (!lockResult?.[0]?.locked) {
      await lockRunner.release();
      return;
    }

    try {
      await this.reconcileProcessingPayouts();
      await this.submitUnpaidEarnings();
    } finally {
      try {
        await lockRunner.query(
          `SELECT pg_advisory_unlock(hashtext('transit:weekly-driver-payouts'))`,
        );
      } finally {
        await lockRunner.release();
      }
    }
  }

  private async submitUnpaidEarnings(): Promise<void> {
    const earnings = await this.earningRepository.find({
      where: { status: DriverEarningStatus.UNPAID },
      order: { createdAt: 'ASC' },
    });
    const byDriver = new Map<string, DriverEarning[]>();
    for (const earning of earnings) {
      const driverEarnings = byDriver.get(earning.driverId) ?? [];
      driverEarnings.push(earning);
      byDriver.set(earning.driverId, driverEarnings);
    }

    for (const [driverId, driverEarnings] of byDriver) {
      const bankAccount = await this.bankAccountRepository.findOne({
        where: { driverId, isActive: true, isVerified: true },
        order: { createdAt: 'DESC' },
      });
      const driver = await this.driverRepository.findOne({ where: { id: driverId } });
      const user = driver
        ? await this.userRepository.findOne({ where: { id: driver.userId } })
        : null;
      if (!bankAccount || !driver || !user) {
        this.logger.warn(`Skipping payout for driver ${driverId}: verified bank account/profile missing`);
        continue;
      }

      const amountPaise = driverEarnings.reduce(
        (total, earning) => total + toBigInt(earning.netAmountPaise),
        0n,
      );
      if (amountPaise < 100n) continue;
      if (amountPaise > BigInt(Number.MAX_SAFE_INTEGER)) {
        this.logger.error(`Skipping payout for driver ${driverId}: amount exceeds safe gateway range`);
        continue;
      }

      const payout = await this.dataSource.transaction(async (manager) => {
        const lockedEarnings = await manager.find(DriverEarning, {
          where: { driverId, status: DriverEarningStatus.UNPAID },
          lock: { mode: 'pessimistic_write' },
        });
        if (lockedEarnings.length === 0) return null;
        const lockedAmount = lockedEarnings.reduce(
          (total, earning) => total + toBigInt(earning.netAmountPaise),
          0n,
        );
        if (lockedAmount < 100n) return null;

        const newPayout = await manager.save(
          manager.create(DriverPayout, {
            driverId,
            bankAccountId: bankAccount.id,
            gatewayPayoutId: null,
            amountPaise: String(lockedAmount),
            currency: 'INR',
            status: DriverPayoutStatus.PROCESSING,
            failureReason: null,
            processedAt: null,
          }),
        );
        for (const earning of lockedEarnings) {
          earning.status = DriverEarningStatus.PROCESSING;
          earning.payoutId = newPayout.id;
        }
        await manager.save(lockedEarnings);
        return newPayout;
      });
      if (payout) await this.submitPayout(payout, bankAccount, driver, user);
    }
  }

  private async reconcileProcessingPayouts(): Promise<void> {
    const payouts = await this.payoutRepository.find({
      where: { status: DriverPayoutStatus.PROCESSING },
      order: { createdAt: 'ASC' },
    });
    for (const payout of payouts) {
      const [bankAccount, driver] = await Promise.all([
        this.bankAccountRepository.findOne({ where: { id: payout.bankAccountId } }),
        this.driverRepository.findOne({ where: { id: payout.driverId } }),
      ]);
      if (!bankAccount || !driver) continue;
      const user = await this.userRepository.findOne({ where: { id: driver.userId } });
      if (!user) continue;

      try {
        if (!payout.gatewayPayoutId) {
          await this.submitPayout(payout, bankAccount, driver, user);
          continue;
        }
        const result = await this.gateway.fetchBankPayout(payout.gatewayPayoutId);
        await this.applyGatewayPayoutStatus(payout, result.status);
      } catch (error) {
        this.logger.warn(
          `Payout ${payout.id} remains processing: ${(error as Error).message}`,
        );
      }
    }
  }

  private async submitPayout(
    payout: DriverPayout,
    bankAccount: BankAccount,
    driver: Driver,
    user: User,
  ): Promise<void> {
    try {
      const result = await this.gateway.createBankPayout({
        payoutId: payout.id,
        driverId: driver.id,
        amountPaise: Number(payout.amountPaise),
        accountNumber: bankAccount.accountNumber,
        accountHolderName: bankAccount.accountHolderName,
        ifscCode: bankAccount.ifscCode,
        email: user.email,
        phone: user.phone,
      });
      payout.gatewayPayoutId = result.id;
      await this.payoutRepository.save(payout);
      await this.applyGatewayPayoutStatus(payout, result.status);
    } catch (error) {
      // Keep the earning reserved. Reusing the same payout ID preserves RazorpayX idempotency on retry.
      payout.failureReason = this.safeFailureReason(error);
      await this.payoutRepository.save(payout);
      this.logger.error(`Could not submit payout ${payout.id}: ${(error as Error).message}`);
    }
  }

  private async applyGatewayPayoutStatus(
    payout: DriverPayout,
    gatewayStatus: string,
  ): Promise<void> {
    if (gatewayStatus === 'processed') {
      await this.dataSource.transaction(async (manager) => {
        const lockedPayout = await manager.findOne(DriverPayout, {
          where: { id: payout.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedPayout || lockedPayout.status === DriverPayoutStatus.COMPLETED) return;
        lockedPayout.status = DriverPayoutStatus.COMPLETED;
        lockedPayout.processedAt = new Date();
        lockedPayout.failureReason = null;
        await manager.save(lockedPayout);
        await manager.update(
          DriverEarning,
          { payoutId: payout.id, status: DriverEarningStatus.PROCESSING },
          { status: DriverEarningStatus.PAID },
        );
      });
    } else if (['failed', 'reversed', 'cancelled', 'rejected'].includes(gatewayStatus)) {
      await this.dataSource.transaction(async (manager) => {
        const lockedPayout = await manager.findOne(DriverPayout, {
          where: { id: payout.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedPayout || lockedPayout.status !== DriverPayoutStatus.PROCESSING) return;
        lockedPayout.status = DriverPayoutStatus.FAILED;
        lockedPayout.failureReason = `RazorpayX payout status: ${gatewayStatus}`;
        await manager.save(lockedPayout);
        await manager.update(
          DriverEarning,
          { payoutId: payout.id, status: DriverEarningStatus.PROCESSING },
          { status: DriverEarningStatus.UNPAID, payoutId: null },
        );
      });
    }
  }

  private toPublicPayment(payment: Payment, includeCheckout = false) {
    return {
      id: payment.id,
      rideId: payment.rideId,
      amountPaise: payment.amountPaise,
      currency: payment.currency,
      status: payment.status,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId,
      failureReason:
        payment.status === PaymentStatus.FAILED
          ? 'Payment could not be completed. Please retry or contact support.'
          : null,
      createdAt: payment.createdAt,
      ...(includeCheckout && payment.gatewayOrderId
        ? {
            checkout: {
              keyId: this.gateway.getCheckoutKeyId(),
              orderId: payment.gatewayOrderId,
              amount: Number(payment.amountPaise),
              currency: payment.currency,
            },
          }
        : {}),
    };
  }

  private pagination(page: number, limit: number) {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.floor(limit)))
      : 20;
    return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
  }

  private safeFailureReason(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Payment gateway error';
    return message.replace(/[\r\n\t]/g, ' ').slice(0, 500);
  }
}
