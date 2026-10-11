import { DataSource } from 'typeorm';

/** DataSource used by TypeORM's CLI. Runtime application config remains in AppModule. */
export default new DataSource({
  type: 'postgres',
  url: process.env.DB_URL,
  entities: [__dirname + '/../**/*.entity.js'],
  migrations: [__dirname + '/migrations/*.js'],
  migrationsTableName: 'migrations',
  synchronize: false,
  ssl: true,
  extra: {
    ssl: { rejectUnauthorized: false },
  },
});
