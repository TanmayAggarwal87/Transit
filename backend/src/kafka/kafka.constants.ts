export enum KafkaTopic {
  RIDE_REQUESTED = 'transit.ride.requested',
  RIDE_ACCEPTED = 'transit.ride.accepted',
  RIDE_STARTED = 'transit.ride.started',
  RIDE_COMPLETED = 'transit.ride.completed',
  RIDE_CANCELLED = 'transit.ride.cancelled',
  DRIVER_LOCATION_UPDATED = 'transit.driver.location_updated',
  PAYMENT_COMPLETED = 'transit.payment.completed',
  SOS_TRIGGERED = 'transit.sos.triggered',
}

export interface EventEnvelope<T = any> {
  eventId: string;
  timestamp: string;
  topic: string;
  data: T;
}
