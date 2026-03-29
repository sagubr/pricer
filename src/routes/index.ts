import { FastifyInstance, FastifyPluginOptions } from "fastify";
import authRouter from "@/modules/auth/auth.routes";
import notificationRouter from "@/modules/notification/notification.routes";
import ibgeRouter from "@/modules/ibge/ibge.routes";
import productNormalizerRouter from "@/modules/product-normalizer/product-normalizer.routes";
import invoiceRouter from "@/modules/invoice/invoice.routes";
import productRouter from "@/modules/product/product.routes";

export async function router(
	fastify: FastifyInstance,
	opts: FastifyPluginOptions,
) {
	await fastify.register(authRouter, { prefix: "/auth" });
	await fastify.register(notificationRouter, { prefix: "/notifications" });
	await fastify.register(ibgeRouter, { prefix: "/ibge" });
	await fastify.register(productNormalizerRouter, {
		prefix: "/product-normalizer",
	});
	await fastify.register(invoiceRouter, { prefix: "/invoices" });
	await fastify.register(productRouter, { prefix: "/products" });
}
