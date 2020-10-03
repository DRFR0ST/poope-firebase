import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import FireRequest from '../FireRequest';

import { IUser } from "./users.d";

const db = admin.firestore();

// Functions Register =>

export const userList = functions.https.onRequest((request, response) => void new UserList(request, response));
export const userInfo = functions.https.onRequest((request, response) => void new UserInfo(request, response));
export const userCreate = functions.https.onRequest((request, response) => void new MealCreate(request, response));
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
    async onRequest() {
        if (!this.query.id) {
            this.onResponse(400, undefined, "'id' query has not been provided.");
            return;
        }

        const user = ((await db.collection("users").doc(this.query.id).get())?.data()) as IUser;

        if (!user) {
            this.onResponse(404, undefined, `Meal with id '${this.query.id}' does not exist.`)
            return;
        }

        this.onResponse(200, { ...user, id: this.query.id });
    }
}


type UserCreateQuery = {
    name: string;
    avatar_url: string;
}
class MealCreate extends FireRequest<IUser, UserCreateQuery> {

    async onRequest() {
        const { name, avatar_url } = this.query;

        if (!name) {
            this.onResponse(400, undefined, "'name' query has not been provided.");
            return;
        }

        if (!avatar_url) {
            this.onResponse(400, undefined, "'avatar_url' query has not been provided.");
            return;
        }

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
    async onRequest() {
        if (!this.query.id) {
            this.onResponse(400, undefined, "'id' query has not been provided.");
            return;
        }

        db.collection("users").doc(this.query.id).delete()
            .then(() => {
                this.onResponse(204);
            })
            .catch(err => {
                this.onResponse(500, undefined, err.message);
            });

    }
}