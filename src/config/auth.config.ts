import { env } from "./env.config";

export const auth = {
	jwtSecret: env.JWT_SECRET,
	jwtExpiresIn: env.JWT_EXPIRES_IN,
};
