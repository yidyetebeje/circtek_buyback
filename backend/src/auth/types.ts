import { t, type Static } from 'elysia'

export const LoginBody = t.Object({
	identifier: t.String(),
	password: t.String(),
})

export type LoginBodyInput = Static<typeof LoginBody>

export const RegisterBody = t.Object({
	name: t.String(),
	user_name: t.String(),
	password: t.String(),
	email: t.String(),
	role_id: t.Number(),
	tenant_id: t.Number(),
})

export type RegisterBodyInput = Static<typeof RegisterBody>

