import { Elysia } from 'elysia'
import { user_routes } from './users'
import jwt from '@elysiajs/jwt'
import { auth_routes } from './auth'
import { role_routes } from './roles'
import { warehouse_routes } from './warehouses'
import { bearer } from '@elysiajs/bearer'
import { swagger } from '@elysiajs/swagger'
import { opentelemetry } from '@elysiajs/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { tenant_routes } from './tenants'
import { diagnostic_routes } from './diagnostics'
import { configuration_routes } from './configuration'
import { grades_routes } from './configuration/grades'
import { stock_management_routes } from './stock'
import { upload_routes } from './uploads'
import { dashboard_stats_routes } from './dashboard/stats'
import { cors } from '@elysiajs/cors'
import catalogApi from "./buyback_catalog";
import buybackApi from "./buyback";
import { emailTemplatesModule } from "./email-templates";
import { statsRoutes } from "./buyback_stats/routes/statsRoutes";
import emailModule from "./email/email-module";
import { external_api_routes } from "./external-api";
import { devices_routes } from "./devices";
import { licensing_routes } from "./licensing";
export const buildApp = () =>
	new Elysia({ prefix: '/api/v1' })
        .use(cors({
            origin: ["http://localhost:4200", "http://localhost:3000","https://circtek-aws.vercel.app", "https://staging-db.circtek.io", "https://db.circtek.io"],
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Accept", "Cookie"],
            credentials: true,
            exposeHeaders: ["Content-Disposition", "Content-Type"],
            preflight: true
        }))
		.get('/', () => 'Hello Elysia')
		.use(swagger({
			path: '/swagger',
			documentation: {
				info: { title: 'Circtek API', version: '1.0.0', description: 'API documentation for Circtek backend' },
				tags: [
					{ name: 'Auth', description: 'Authentication' },
					{ name: 'Users', description: 'User management' },
					{ name: 'Roles', description: 'Role management' },
					{ name: 'Warehouses', description: 'Warehouse management' },
					{ name: 'Tenants', description: 'Tenant management' },
					{ name: 'Diagnostics', description: 'Device test results' },
					{ name: 'Configuration', description: 'Workflows, Label Templates, and Assignments' },
					{ name: 'Grades', description: 'Grading management' },
					{ name: 'Stock', description: 'Current stock levels and management' },
					{ name: 'Stock Movements', description: 'Stock movements ledger and audit trail' },
					{ name: 'Stock Purchases', description: 'Purchase orders and receiving' },
					{ name: 'Stock Transfers', description: 'Inter-warehouse transfers' },
					{ name: 'Stock Adjustments', description: 'Stock adjustments and write-offs' },
					{ name: 'Stock Consumption', description: 'Parts consumption for repairs' },
					{ name: 'Repairs', description: 'Device repairs and maintenance' },
					{ name: 'SKU Specs', description: 'SKU specifications and device details' },
					{ name: 'Repair Reasons', description: 'Repair reason management and categorization' },
					{ name: 'Stock Management', description: 'Global stock management operations' },
					{ name: 'Uploads', description: 'File upload and management' },
					{ name: 'Dashboard', description: 'Dashboard statistics and analytics' },
					{ name: 'Stats', description: 'Stats' },
					{ name: 'Buyback', description: 'Buyback' },
					{ name: 'Buyback Catalog', description: 'Buyback Catalog' },
					{ name: 'Back Market', description: 'Back Market Integration' },
					{ name: 'Email Templates', description: 'Email Templates' },
					{ name: 'Email', description: 'Email' },
					{ name: 'Devices', description: 'Device LPN lookup and management' },
					{ name: 'Licensing', description: 'License management and authorization' },
				],
			},
		}))
		.use(opentelemetry({
			spanProcessors: [
				(new BatchSpanProcessor(
					new OTLPTraceExporter({})
				) as unknown as any),
			],
		}))
		.use(bearer())
		.use(
			jwt({
				name: 'jwt',
				secret: process.env.JWT_SECRET || 'dev_secret',
				exp: '18h',
			})
		)
		.use(catalogApi)
		.use(buybackApi)
		.use(emailTemplatesModule)
		.use(emailModule)
		.use(statsRoutes)
		.use(user_routes)
		.use(auth_routes)
		.use(role_routes)
		.use(warehouse_routes)
		.use(tenant_routes)
		.use(diagnostic_routes)
		.use(configuration_routes)
		.use(grades_routes)
		.use(stock_management_routes)
		.use(upload_routes)
		.use(dashboard_stats_routes)
		.use(external_api_routes)
		.use(devices_routes)
		.use(licensing_routes)
		.use(catalogApi)


