import Elysia from 'elysia'
import { workflows_routes } from './workflows'
import { label_templates_routes } from './label-templates'
import { wifi_profiles_routes } from './wifi-profiles'
import { grades_routes } from './grades'

export const configuration_routes = new Elysia({ prefix: '/configuration' })
    .use(workflows_routes)
    .use(label_templates_routes)
    .use(wifi_profiles_routes)
    .use(grades_routes)


