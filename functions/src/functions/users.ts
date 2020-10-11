import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import FireRequest from '../FireRequest';

import { IUser } from "./users.d";
import { checkFieldExists } from './utils';

const db = admin.firestore();

// Functions Register =>

export const userList = functions.https.onRequest((request, response) => void new UserList(request, response));
export const userInfo = functions.https.onRequest((request, response) => void new UserInfo(request, response));
export const userCreate = functions.https.onRequest((request, response) => void new UserCreate(request, response));
export const userRemove = functions.https.onRequest((request, response) => void new UserRemove(request, response));

// Classes => 

type UserListBody = IUser[];
class UserList extends FireRequest<UserListBody> {
    async onRequest() {
        const users: UserListBody = [];

        (await db.collection("users").get())
            .forEach((userData) => {
                if (userData && userData.exists) {
                    users.push({ id: userData.id, ...userData.data() } as unknown as IUser);
                }
            });

        this.onResponse(200, users);
    }
}

type UserInfoQuery = { id: string }
class UserInfo extends FireRequest<IUser, UserInfoQuery> {
    parseQuery() {
        checkFieldExists(this.request.query, "id");
    }

    async onRequest() {
        const userRef = await db.collection("users").doc(this.query.id).get();

        if (!userRef || !userRef.exists) {
            this.onResponse(404, undefined, `User with id '${this.query.id}' does not exist.`)
            return;
        }

        const user = userRef.data() as IUser;

        this.onResponse(200, { ...user, id: userRef.id });
    }
}


type UserCreateQuery = {
    name: string;
    avatar_url: string;
}
class UserCreate extends FireRequest<IUser, UserCreateQuery> {
    parseQuery() {
        checkFieldExists(this.request.query, "name");
        checkFieldExists(this.request.query, "avatar_url");
    }

    async onRequest() {
        const { name, avatar_url } = this.query;

        db.collection("users").add({ name, avatar_url })
            .then((docRef) => {
                this.onResponse(200, { id: docRef.id });
            })
            .catch((err) => {
                this.onResponse(500, undefined, err.message);
            });
    }
}

type UserRemoveQuery = { id: string }
class UserRemove extends FireRequest<IUser, UserRemoveQuery> {
    parseQuery() {
        checkFieldExists(this.request.query, "id");
    }

    async onRequest() {

        db.collection("users").doc(this.query.id).delete()
            .then(() => {
                this.onResponse(204);
            })
            .catch(err => {
                this.onResponse(500, undefined, err.message);
            });

    }
}