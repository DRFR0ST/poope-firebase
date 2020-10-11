import { Card, conversation, Table } from '@assistant/conversation';
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { IAuthor, IMeal } from './meals.d';
import { filterTodaysMeals, sortMealByDate } from './utils';
import * as moment from "moment";

const db = admin.firestore();
const actions = conversation();


actions.handle("readLatestMeal", async conv => {
    const meals: any = [];

    (await db.collection("meals").get())
        .forEach((mealData) => {
            if (mealData && mealData.exists) {
                meals.push({ id: mealData.id, ...mealData.data() } as unknown as IMeal);
            }
        });

    const meal = meals.sort(sortMealByDate)[0] as IMeal;

    if (!meal) {
        conv.add("No meal found.");
        return Promise.resolve("Read complete");;
    }

    // @ts-ignore
    const authorRef = (await meal.author?.get?.());

    if (authorRef && authorRef.exists) {
        meal.author = { ...authorRef?.data(), id: authorRef.id } as IAuthor;
    }

    conv.add(`The last meal was ${meal.amount}, ${moment(meal.timestamp).fromNow()} (${moment(meal.timestamp).format("HH:mm").toString()})`);
    conv.add(new Card({
        "title": `${meal.amount}ml`,
        "subtitle": `${moment(meal.timestamp).fromNow()} ${meal.author ? `by ${meal.author.name}` : ""}`
    }));

    return Promise.resolve("Read complete");
});

type TDate = { day: number, month: number, year: number };
type TTime = {
    "hours": number,
    "minutes": number,
    "seconds": number,
    "nanos": number
}
type TDateTime = TDate & TTime;
const firebaseDateToMoment = (datetime: TDateTime): moment.Moment => {
    if (!datetime || typeof datetime !== "object") return moment(new Date());
    const dateString = datetime ? `${datetime.day}.${datetime.month}.${datetime.year}` : moment().format("DD.MM.YYYY");
    const timeString = datetime ? `${datetime.hours}:${datetime.minutes}:${datetime.seconds}` : moment().format("HH:mm:ss");

    const datetimeString = `${dateString} ${timeString}`;
    return moment(datetimeString, "DD.MM.YYYY HH:mm:ss");
}

actions.handle("addMeal", async conv => {
    const amount = conv.session?.params?.['amount'];
    const author_id = "B3r7ivZXDX1mTssTVOzT";
    const timestamp = firebaseDateToMoment(conv.session?.params?.['timestamp']).toDate();

    if (!amount || isNaN(Number(amount))) {
        conv.add("Something went wrong. Please try again.");
        return Promise.resolve("Read complete");
    }

    const _author = db.collection("users").doc(author_id);
    return db.collection("meals").add({ amount: Number(amount), timestamp: timestamp.toString(), author: _author })
        .then(() => {
            conv.add(new Card({
                "title": `Added new meal`,
                "subtitle": `${amount}ml`
            }));
        })
        .catch(() => {
            conv.add(`Something went wrong. Please try again.`);
        });
});

actions.handle("readNextMealTime", async conv => {
    const meals: any = [];

    (await db.collection("meals").get())
        .forEach((mealData) => {
            if (mealData && mealData.exists) {
                meals.push({ id: mealData.id, ...mealData.data() } as unknown as IMeal);
            }
        });

    const meal = meals.sort(sortMealByDate)[0] as IMeal;

    if (!meal) {
        conv.add("No meal found.");
        return Promise.resolve("Read complete");;
    }

    // @ts-ignore
    const authorRef = (await meal.author?.get?.());

    if (authorRef && authorRef.exists) {
        meal.author = { ...authorRef?.data(), id: authorRef.id } as IAuthor;
    }

    const nextTime = moment(meal.timestamp).add(3, "hours");

    conv.add(`The next meal should occur ${nextTime.fromNow()}, at ${moment(nextTime).format("HH:mm").toString()}`);

    return Promise.resolve("Read complete");
});

actions.handle("deleteLastMeal", async conv => {
    const meals: any = [];

    (await db.collection("meals").get())
        .forEach((mealData) => {
            if (mealData && mealData.exists) {
                meals.push({ id: mealData.id, ...mealData.data() } as unknown as IMeal);
            }
        });

    const meal = meals.sort(sortMealByDate)[0] as IMeal;

    if (!meal) {
        conv.add("No meal found.");
        return Promise.resolve("Read complete");;
    }

    return db.collection("meals").doc(meal.id).delete()
        .then(() => {
            conv.add(`Alright, last meal deleted.`);
            conv.add(new Card({
                "title": `Removed last meal`,
                "subtitle": `${meal.amount}ml added ${moment(meal.timestamp).fromNow()}`
            }));
        })
        .catch(err => {
            conv.add(`Something went wrong. Please try again.`);
        });
});

actions.handle("readLatestMealTime", async conv => {
    const meals: any = [];

    (await db.collection("meals").get())
        .forEach((mealData) => {
            if (mealData && mealData.exists) {
                meals.push({ id: mealData.id, ...mealData.data() } as unknown as IMeal);
            }
        });

    const meal = meals.sort(sortMealByDate)[0] as IMeal;

    if (!meal) {
        conv.add("No meal found.");
        return Promise.resolve("Read complete");;
    }

    // @ts-ignore
    const authorRef = (await meal.author?.get?.());

    if (authorRef && authorRef.exists) {
        meal.author = { ...authorRef?.data(), id: authorRef.id } as IAuthor;
    }

    const mealFromNow = moment(meal.timestamp).fromNow();
    const mealTime = moment(meal.timestamp).format("HH:mm");

    conv.add(`The last meal was at ${mealTime}, ${mealFromNow}`);
    conv.add(new Card({
        "title": `${mealTime}`,
        "subtitle": `${meal.amount}ml, ${mealFromNow}`
    }));

    return Promise.resolve("Read complete");
});

actions.handle("readTodaysMeals", async conv => {
    const meals: any = [];

    (await db.collection("meals").get())
        .forEach((mealData) => {
            if (mealData && mealData.exists) {
                meals.push({ id: mealData.id, ...mealData.data() } as unknown as IMeal);
            }
        });

    if (meals.length === 0) {
        conv.add("No meals yet for today.");
        return Promise.resolve("Read complete");;
    }

    for (const meal of meals) {
        // @ts-ignore
        const authorRef = (await meal.author?.get?.());

        if (authorRef && authorRef.exists) {
            meal.author = { ...authorRef?.data(), id: authorRef.id };
        }
    }

    const mealRows = meals
        .filter(filterTodaysMeals)
        .sort(sortMealByDate)
        .map((meal: IMeal) => {
            return {
                cells: [
                    {
                        text: `${meal.amount}`
                    },
                    {
                        text: `${meal.author.name}`
                    },
                    {
                        text: `${moment(meal.timestamp).fromNow()}`
                    }
                ]
            }
        });

    conv.add(new Table({
        "title": `Today's meals`,
        "columns": [{
            "header": "Amount"
        }, {
            "header": "Parent"
        }, {
            "header": "Time"
        }],
        "rows": mealRows
    }));

    return Promise.resolve("Read complete");
});

// actions.handle('subscribeMealTimeNotifications', conv => {
//     const intentName = 'pushIntent';
//     const notificationsSlot = conv?.session?.params?.[`NotificationSlot_${intentName}`];
//     if (notificationsSlot.permissionStatus == 'PERMISSION_GRANTED') {
//         const updateUserId = notificationsSlot.additionalUserData.updateUserId;
//         // Store the user ID and the notification's target intent for later use.
//         // (Use a database, like Firestore, for best practice.)
//     }
// });

// /**
//  * Triggers when a user gets a new follower and sends a notification.
//  *
//  * Followers add a flag to `/followers/{followedUid}/{followerUid}`.
//  * Users save their device notification tokens to `/users/{followedUid}/notificationTokens/{notificationToken}`.
//  */
// exports.sendFollowerNotification = functions.database.ref('/followers/{followedUid}/{followerUid}')
//     .onWrite(async (change, context) => {
//       const followerUid = context.params.followerUid;
//       const followedUid = context.params.followedUid;
//       // If un-follow we exit the function.
//       if (!change.after.val()) {
//         return console.log('User ', followerUid, 'un-followed user', followedUid);
//       }
//       console.log('We have a new follower UID:', followerUid, 'for user:', followedUid);

//       // Get the list of device notification tokens.
//       const getDeviceTokensPromise = admin.database()
//           .ref(`/users/${followedUid}/notificationTokens`).once('value');

//       // Get the follower profile.
//       const getFollowerProfilePromise = admin.auth().getUser(followerUid);

//       // The snapshot to the user's tokens.
//       let tokensSnapshot;

//       // The array containing all the user's tokens.
//       let tokens;

//       const results = await Promise.all([getDeviceTokensPromise, getFollowerProfilePromise]);
//       tokensSnapshot = results[0];
//       const follower = results[1];

//       // Check if there are any device tokens.
//       if (!tokensSnapshot.hasChildren()) {
//         return console.log('There are no notification tokens to send to.');
//       }
//       console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
//       console.log('Fetched follower profile', follower);

//       // Notification details.
//       const payload = {
//         notification: {
//           title: 'You have a new follower!',
//           body: `${follower.displayName} is now following you.`,
//           icon: follower.photoURL
//         }
//       };

//       // Listing all tokens as an array.
//       tokens = Object.keys(tokensSnapshot.val());
//       // Send notifications to all tokens.
//       const response = await admin.messaging().sendToDevice(tokens, payload);
//       // For each message check if there was an error.
//       const tokensToRemove = [];
//       response.results.forEach((result, index) => {
//         const error = result.error;
//         if (error) {
//           console.error('Failure sending notification to', tokens[index], error);
//           // Cleanup the tokens who are not registered anymore.
//           if (error.code === 'messaging/invalid-registration-token' ||
//               error.code === 'messaging/registration-token-not-registered') {
//             tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
//           }
//         }
//       });
//       return Promise.all(tokensToRemove);
//     });

export default functions.https.onRequest(actions);