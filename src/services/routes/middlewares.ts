import { z } from 'zod'
import { NextFunction, Request, Response } from "express";
import SessionManager from "@security/sessionManager";
import ApiError from "@routes/errors";
import AuthManager from '../security/authManager.js';

export interface CustomRequest<UserType> extends Request {
    user?: UserType;
}

export type PreprocessCheck = (user: object) => Promise<boolean>;
export type PostprocessCheck = (user: object, routeResult: any) => Promise<boolean>;

export const preprocessChecks = (checks: Record<string, PreprocessCheck>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as CustomRequest<any>)
        for (const checkName in checks) {
            const result = await checks[checkName](user)
            if (!result) 
                next(new ApiError({statusCode: 401, message: `Failed preprocess check: ${checkName}`}))
        }
        next()
    }
}

export const postprocessChecks = (checks: Record<string, PostprocessCheck>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as CustomRequest<any>)
        const response = res.locals.responseBody
        for (const checkName in checks) {
            const result = await checks[checkName](user, response)
            if (!result) 
                next(new ApiError({statusCode: 401, message: `Failed postprocess check: ${checkName}`}))
        }
        next()
    }
}

export const roleChecks = (area: string, action: string, authManager: AuthManager) => {
    return async (req: Request, res: Response, next: NextFunction) => {

    }
}

export const bodyParsing = (bodySchema: z.AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = bodySchema.parse(req.body);
            next();
        } 
        catch (error) {
            next(new ApiError({ statusCode: 400, message: "Invalid body type" }))
        }
    };
};

export const session = <UserType>(sessionManager: SessionManager<UserType>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '') 
                ?? new Error('No token provided');

            if (token instanceof Error) 
                throw token;

            (req as CustomRequest<UserType>).user = await sessionManager.verifyToken(token);
            next();
        }
        catch (error) {
            next(new ApiError({ statusCode: 401, message: "Invalid user token" }))
        }
    }
}

export const    errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    const isApiError = err instanceof ApiError
    if (!isApiError) {
        res.status(500).json({error: "Unknown error"})
        return
    } 

    const error = err as ApiError
    res.status(error.statusCode).json(error.format())
}

export const send = (req: Request, res: Response) => {
    res.status(200)
    if (res.locals.responseValue)
        res.json(res.locals.responseValue)
}