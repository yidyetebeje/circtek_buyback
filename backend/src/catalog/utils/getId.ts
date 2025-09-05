import { JwtUser } from "@/middleware/auth";

export const getClientId = (user?: JwtUser) => {
    if(!user) return undefined;
    if(user.roleSlug === 'client') return user.id;
    return user.clientId;
}