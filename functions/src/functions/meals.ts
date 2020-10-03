import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import FireRequest from '../FireRequest';

import { IMeal } from "./meals.d";

const db = admin.firestore();

// Functions Register =>

export const mealList = functions.https.onRequest((request, response) => void new MealList(request, response));
export const mealInfo = functions.https.onRequest((request, response) => void new MealInfo(request, response));
export const mealCreate = functions.https.onRequest((request, response) => void new MealCreate(request, response));
export const mealRemove = functions.https.onRequest((request, response) => void new MealRemove(request, response));

// Classes => 

type MealListBody = IMeal[];
class MealList extends FireRequest<MealListBody> {
    async onRequest() {
        const meals: MealListBody = [];

        (await db.collection("meals").get())
            .forEach((mealData) => {
                if (mealData && mealData.exists) {
                    meals.push({ id: mealData.id, ...mealData.data() } as unknown as IMeal);
                }
            });

        for (const meal of meals) {
            // @ts-ignore
            const authorRef = (await meal.author?.get?.());

            if (authorRef && authorRef.exists) {
                meal.author = { ...authorRef?.data(), id: authorRef.id };
            }
        }

        this.onResponse(200, meals);
    }
}

type MealInfoQuery = { id: string }
class MealInfo extends FireRequest<IMeal, MealInfoQuery> {
    async onRequest() {
        if (!this.query.id) {
            this.onResponse(400, undefined, "'id' query has not been provided.");
            return;
        }

        const meal = ((await db.collection("meals").doc(this.query.id).get())?.data()) as IMeal;

        if (!meal) {
            this.onResponse(404, undefined, `Meal with id '${this.query.id}' does not exist.`)
            return;
        }

        // @ts-ignore
        const authorRef = (await meal.author.get());

        if (authorRef && authorRef.exists) {
            meal.author = { ...authorRef.data(), id: authorRef.id };
        }

        this.onResponse(200, { ...meal, id: this.query.id });
    }
}


type MealCreateQuery = {
    timestamp: string;
    author_id: string;
    amount: number;
}
class MealCreate extends FireRequest<IMeal, MealCreateQuery> {

    async onRequest() {
        const { amount, timestamp, author_id } = this.query;

        if (!amount) {
            this.onResponse(400, undefined, "'amount' query has not been provided.");
            return;
        }

        if (!timestamp) {
            this.onResponse(400, undefined, "'timestamp' query has not been provided.");
            return;
        }

        if (!author_id) {
            this.onResponse(400, undefined, "'author_id' query has not been provided.");
            return;
        }

        const _author = db.collection("users").doc(author_id);
        db.collection("meals").add({ amount: Number(amount), timestamp: new Date(timestamp), author: _author })
            .then((docRef) => {
                this.onResponse(200, { id: docRef.id });
            })
            .catch((err) => {
                this.onResponse(500, undefined, err.message);
            });
    }
}

type MealRemoveQuery = { id: string }
class MealRemove extends FireRequest<IMeal, MealRemoveQuery> {
    async onRequest() {
        if (!this.query.id) {
            this.onResponse(400, undefined, "'id' query has not been provided.");
            return;
        }

        db.collection("meals").doc(this.query.id).delete()
            .then(() => {
                this.onResponse(204);
            })
            .catch(err => {
                this.onResponse(500, undefined, err.message);
            });

    }
}