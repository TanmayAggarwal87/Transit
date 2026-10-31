import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// shortcut: suppress kafkajs requestQueue negative timeout warning in Node 20+, upgrade when kafkajs releases official fix
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning') return;
  console.warn(warning.name, warning.message);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

