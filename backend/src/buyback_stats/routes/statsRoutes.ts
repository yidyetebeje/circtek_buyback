import { Elysia, t, type Static } from "elysia";
import { statsController } from "../controller/statsController";
import { requireRole } from "../../auth";
import { 
    DateRangeQuerySchema,
    TopDevicesQuerySchema,
    TopShopsQuerySchema,
    ShopIdParamsSchema,
    AuthenticatedUserSchema,
    TimeSeriesQuerySchema,
} from "../types";





export const statsRoutes = (app: Elysia) => app
    .group("/stats", (group) => group
        // Use the centralized authentication middleware instead of custom implementation
        
        // Platform Statistics - All require authentication. Access scoping is handled by service layer.
        .group("/platform", (platformGroup) => platformGroup
            // Admin-only access for platform statistics
            .use(requireRole(['admin']))
            .get("/overview", ({ query, currentRole, currentTenantId, currentUserId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getPlatformOverview({ query, currentRole, currentTenantId, currentUserId, set });
            }, {
                query: DateRangeQuerySchema,
                detail: { summary: "Get platform-wide order statistics overview (admin only)", tags: ["Statistics", "Platform"] }
            })
            .get("/top-devices", ({ query, currentRole, currentTenantId, currentUserId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getPlatformTopDevices({ query, currentRole, currentTenantId, currentUserId, set });
            }, {
                query: TopDevicesQuerySchema,
                detail: { summary: "Get platform-wide top performing devices (scoped by user access)", tags: ["Statistics", "Platform"] }
            })
            .get("/time-series", ({ query, currentRole, currentTenantId, currentUserId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getPlatformTimeSeries({ query, currentRole, currentTenantId, currentUserId, set });
            }, {
                query: TimeSeriesQuerySchema,
                detail: { summary: "Get platform-wide order time series (scoped by user access)", tags: ["Statistics", "Platform"] }
            })
            // This specific sub-route for top-shops under /platform might be redundant if there's a general /platform/top-shops below
            // However, keeping it separate if it serves a distinct purpose or different tagging needed.
        )
        .use(requireRole([]))
        // Platform Top Shops - Accessible by authenticated users, filtered by access in service layer
        .get("/platform/top-shops", ({ query, currentRole, currentTenantId, currentUserId, set }) => {
            if (!currentRole || !currentTenantId || !currentUserId) {
                set.status = 401;
                return { success: false, error: "Authentication required" };
            }
            return statsController.getPlatformTopShops({ query, currentRole, currentTenantId, currentUserId, set });
        }, {
            query: TopShopsQuerySchema,
            // Updated summary to reflect it's scoped by user access, not just for admins
            detail: { summary: "Get platform-wide top performing shops (scoped by user access)", tags: ["Statistics", "Platform"] }
        })

        // Shop-Specific Statistics by shopId (for any authenticated user, access checked by service)
        .group("/shop/:shopId", (shopSpecificGroup) => shopSpecificGroup
            // No admin check here; controller/service handles access based on user and shopId via userShopAccess.
            // Ensures user is at least authenticated to attempt access.
            .get("/overview", ({ params, query, currentRole, currentTenantId, currentUserId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getShopOverview({ params: params as any, query, currentRole, currentTenantId, currentUserId, set });
            }, {
                params: ShopIdParamsSchema, 
                query: DateRangeQuerySchema,
                detail: { summary: "Get specific shop's overview (Admin or direct access)", tags: ["Statistics", "Admin"] }
            })
            .get("/top-devices", ({ params, query, currentRole, currentTenantId, currentUserId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getShopTopDevices({ params: params as any, query, currentRole, currentTenantId, currentUserId, set });
            }, {
                params: ShopIdParamsSchema,
                query: TopDevicesQuerySchema,
                detail: { summary: "Get specific shop's top devices (Admin or direct access)", tags: ["Statistics", "Admin"] }
            })
            .get("/catalog-overview", ({ params, set }) => {
                return statsController.getShopCatalogOverview({ params: params as any, set });
            }, {
                params: ShopIdParamsSchema,
                detail: { summary: "Get catalog overview statistics for specific shop", tags: ["Statistics", "Shop"] }
            })
            .get("/models-per-category", ({ params, set }) => {
                return statsController.getModelsPerCategory({ params: params as any, set });
            }, {
                params: ShopIdParamsSchema,
                detail: { summary: "Get model counts per category for shop", tags: ["Statistics", "Shop"] }
            })
            .get("/models-per-brand", ({ params, set }) => {
                return statsController.getModelsPerBrand({ params: params as any, set });
            }, {
                params: ShopIdParamsSchema,
                detail: { summary: "Get model counts per brand for shop", tags: ["Statistics", "Shop"] }
            })
            .get("/time-series", ({ params, query, currentRole, currentTenantId, currentUserId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getShopTimeSeries({ params: params as any, query, currentRole, currentTenantId, currentUserId, set });
            }, {
                params: ShopIdParamsSchema,
                query: TimeSeriesQuerySchema,
                detail: { summary: "Get specific shop's order time series", tags: ["Statistics", "Shop"] }
            })
        )
        
        // For Authenticated Shop Clients accessing their own shop stats
        .group("/my-shop", (myShopGroup) => myShopGroup
            // Create a custom middleware for shop users only (excluding admins)
            .guard({
                beforeHandle: ({ currentRole, currentTenantId, currentUserId, managedShopId, set }) => {
                    // This route is specifically for non-admin users accessing their own shopId from token.
                    if (currentRole == 'admin' || currentRole =="super_admin") {
                        set.status = 403;
                        return { error: "Admins should use /stats/shop/{shopId} routes. /my-shop is for non-admin shop users." };
                    }
                    

                    
                }
            })
            .get("/overview", ({ query, currentRole, currentTenantId, currentUserId, managedShopId,set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                // user and user.shopId are validated by onBeforeHandle
                return statsController.getMyShopOverview({ query, currentRole, currentTenantId, currentUserId, shopId: managedShopId, set });
            }, {
                query: DateRangeQuerySchema,
                detail: { summary: "Get my shop's overview", tags: ["Statistics"] }
            })
            .get("/top-devices", ({ query, currentRole, currentTenantId, currentUserId, managedShopId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getMyShopTopDevices({ query, currentRole, currentTenantId, currentUserId, shopId: managedShopId, set });
            }, {
                query: TopDevicesQuerySchema,
                detail: { summary: "Get my shop's top devices", tags: ["Statistics"] }
            })
            .get("/time-series", ({ query, currentRole, currentTenantId, currentUserId,managedShopId, set }) => {
                if (!currentRole || !currentTenantId || !currentUserId) {
                    set.status = 401;
                    return { success: false, error: "Authentication required" };
                }
                return statsController.getMyShopTimeSeries({ query, currentRole, currentTenantId, currentUserId, shopId: managedShopId, set });
            }, {
                query: TimeSeriesQuerySchema,
                detail: { summary: "Get my shop's order time series", tags: ["Statistics"] }
            })
        )
    ); 