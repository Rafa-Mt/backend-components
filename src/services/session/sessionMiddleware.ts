import SessionManager from "@session/sessionManager"

import { NextFunction, Request, Response } from "express";

export interface CustomRequest<UserType> extends Request {
    user?: UserType;
}

export const buildManagerRoute = <UserType>(manager: SessionManager<UserType>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '') 
                ?? new Error('No token provided');

            if (token instanceof Error) 
                throw token;
            
            (req as CustomRequest<UserType>).user = manager.verifyToken(token);
            next();
        }
        catch (error) {
            return res.status(401).send({error: "Invalid user token"});
        }
    }
}
