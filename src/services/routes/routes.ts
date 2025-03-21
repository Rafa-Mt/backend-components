import { NextFunction, Router, Request, Response, RequestHandler } from "express"
import { z } from 'zod'
import { CustomRequest, PostprocessCheck, PreprocessCheck, roleChecks } from '@routes/middlewares'
import { preprocessChecks, postprocessChecks, bodyParsing, errorHandler, session, send } from '@routes/middlewares'
import ApiError from "@routes/errors";
import SessionManager from "@security/sessionManager";
import AuthManager from "@security/authManager";
import DbManager, { DbAdapter } from "@db/dbManager";
import CacheManager from "@db/cacheManager";
import PgAdapter from "../db/pgAdapter.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface State<DB extends DbAdapter, User> {
    db: DbManager<DB>
    cache: CacheManager,
    user: User
}

export interface RouteArgs {
    path: string;
    method: HttpMethod;
    handler: (args: HandlerArgs<any, any, any>) => Promise<any>;
    bodySchema?: z.AnyZodObject,
    attributeChecks?: {
        preprocess?: Record<string, PreprocessCheck> 
        postprocess?: Record<string, PostprocessCheck> 
    }
    roleCheck?: {
        area: string,
        action: string
    }
}

export interface HandlerArgs<Body, User, StateDb extends DbAdapter> {
    body: Body,
    query: any,
    params: any,
    user: User,
    state: State<StateDb, User>
}

export interface Managers {
    session: SessionManager<any>
    auth: AuthManager
}

export const buildRoute = (state: State<any, any>, managers: Managers, router: Router, config: RouteArgs) => {
    const middlewarePipeline: RequestHandler[] = [];
    if (config.bodySchema && config.method !== 'GET')
        middlewarePipeline.push(bodyParsing(config.bodySchema))

    if (config.roleCheck)
        middlewarePipeline.push(roleChecks(config.roleCheck.area, config.roleCheck.action, managers.auth))

    if (config.attributeChecks?.preprocess)
        middlewarePipeline.push(preprocessChecks(config.attributeChecks.preprocess))

    middlewarePipeline.push(session(managers.session))

    const mainProcess = async (req: Request, res: Response, next: NextFunction) => {
        const body = config.bodySchema ? req.body : null
        const user = (req as CustomRequest<any>).user
        try {
            const response = await config.handler({ state, user, body, query: req.query, params: req.params  })
            if (response)
                res.locals.responseValue = response
        }
        catch (error) {
            next(error)   
        }
    }

    middlewarePipeline.push(mainProcess)

    if (config.attributeChecks?.postprocess)
        middlewarePipeline.push(postprocessChecks(config.attributeChecks.postprocess))

    middlewarePipeline.push(send)

    switch (config.method) {
        case "GET":
            router.get(config.path, ...middlewarePipeline, errorHandler); break;
        case "POST":
            router.get(config.path, ...middlewarePipeline, errorHandler); break;
        case "PUT":
            router.get(config.path, ...middlewarePipeline, errorHandler); break;
        case "DELETE":
            router.get(config.path, ...middlewarePipeline, errorHandler); break;
    }
}

export const buildRouters = (state: State<any, any>, managers: Managers, router: Router, routes: RouteArgs[]) => {
    routes.forEach((route) => buildRoute(state, managers, router, route))
}

// TEST

const router = Router()

interface TestUser {
    username: string,
}

const bodyType = z.object({
    username: z.string()
})

const emailCheck = () => {
    
}

type BodyType = z.infer<typeof bodyType>

const routeHandler = async ({state, user, body}: HandlerArgs<TestUser, BodyType, PgAdapter>) => {

}


const routeConfig: RouteArgs = {
    path: '/test/set-email',
    method: "POST",
    handler: routeHandler,
    bodySchema: bodyType,

}