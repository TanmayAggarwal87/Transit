import { DataSource, SelectQueryBuilder } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { BankAccount } from '../drivers/entities/bank-account.entity';
import { DriverDocument } from '../drivers/entities/driver-document.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { VehicleDocument } from '../drivers/entities/vehicle-document.entity';
import { Vehicle } from '../drivers/entities/vehicle.entity';
import { PaymentMethod } from '../payment-methods/entity/payment-method.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Fare } from '../rides/entities/fare.entity';
import { RideStatusHistory } from '../rides/entities/ride-status-history.entity';
import { Ride } from '../rides/entities/ride.entity';
import { User } from '../users/entities/user.entity';
import { RideAnalytics } from './entities/ride-analytics.entity';
import { HistoryService } from './history.service';

class OfflineDataSource extends DataSource {
  // Build real PostgreSQL mappings without connecting to or changing any database.
  prepareMetadata() {
    return this.buildMetadatas();
  }
}

describe('history PostgreSQL queries', () => {
  it('maps entity properties and parameterizes rider identity in both insight queries', async () => {
    const source = new OfflineDataSource({
      type: 'postgres',
      entities: [
        User,
        RefreshToken,
        Driver,
        Vehicle,
        DriverDocument,
        VehicleDocument,
        BankAccount,
        PaymentMethod,
        Ride,
        Fare,
        RideStatusHistory,
        Payment,
        RideAnalytics,
      ],
    });
    await source.prepareMetadata();
    const queries: { sql: string; parameters: unknown[] }[] = [];
    const spy = jest
      .spyOn(SelectQueryBuilder.prototype, 'getRawMany')
      .mockImplementation(function (this: SelectQueryBuilder<Ride>) {
        const [sql, parameters] = this.getQueryAndParameters();
        queries.push({ sql, parameters });
        return Promise.resolve([]);
      });
    try {
      const service = new HistoryService(
        source.getRepository(Ride),
        source.getRepository(Driver),
        source.getRepository(RideAnalytics),
      );
      await service.getRiderInsights('rider-identity', 1);
      expect(queries).toHaveLength(2);
      expect(queries[0].sql).toContain(
        'CAST("payment"."amount_paise" AS numeric)',
      );
      expect(queries[0].sql).toContain('"analytics"."co2_saved_kg"');
      expect(queries[0].sql).toContain('"ride"."trip_completed_at"');
      for (const query of queries) {
        expect(query.sql).toMatch(/"ride"\."rider_id" = \$\d/);
        expect(query.sql).not.toContain('rider-identity');
        expect(query.parameters).toContain('rider-identity');
      }
    } finally {
      spy.mockRestore();
    }
  });
});
