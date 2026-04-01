"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston = require("winston");
const app_module_1 = require("./app.module");
const logger = nest_winston_1.WinstonModule.createLogger({
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, stack }) => {
                const ctx = context ? `[${context}] ` : '';
                return `${timestamp} ${level} ${ctx}${stack ?? message}`;
            })),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
    ],
});
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger });
    app.enableCors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Pipeline server running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map