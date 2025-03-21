import { Collection } from 'mongoose';
import jwt, { SignOptions } from 'jsonwebtoken';
const { sign, verify } = jwt;

interface SessionManagerArgs {
    secret: string;
    expiresIn: SignOptions['expiresIn'];
    blacklistCollection: Collection
}

export default class SessionManager<UserType> {
    private secret: string;
    private ttl: SignOptions['expiresIn'];    
    private blacklist: Collection

    constructor({secret, expiresIn, blacklistCollection}: SessionManagerArgs) {
        this.secret = secret;
        this.ttl = expiresIn;
        this.blacklist = blacklistCollection
    }

    public createToken(user: UserType & object): string {
        return sign(user, this.secret, {expiresIn: this.ttl});
    }

    public async verifyToken (token: string): Promise<UserType> {
        const blacklistResult = await this.blacklist.findOne({ content: token })

        if (blacklistResult) {
            throw new Error("Token blacklisted")
        }
        return verify(token, this.secret) as UserType;
    }
}