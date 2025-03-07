import jwt, { SignOptions } from 'jsonwebtoken';
const { sign, verify } = jwt;

import { config as dotenv } from 'dotenv';
dotenv();

interface SessionManagerArgs {
    secret: string;
    expiresIn: SignOptions['expiresIn'];
}

export default class SessionManager<UserType> {
    private secret: string;
    private ttl: SignOptions['expiresIn'];    

    constructor({secret, expiresIn}: SessionManagerArgs) {
        this.secret = secret;
        this.ttl = expiresIn;
    }

    public createToken(user: UserType & object): string {
        return sign(user, this.secret, {expiresIn: this.ttl});
    }

    public verifyToken(token: string): UserType {
        return verify(token, this.secret) as UserType;
    }
}