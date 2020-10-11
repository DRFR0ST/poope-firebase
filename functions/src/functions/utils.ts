import { IMeal } from "./meals.d";
import * as moment from 'moment';

export const checkFieldExists = (obj: Object, label: string) => {
    // @ts-ignore
    if (!Object.keys(obj).includes(label) && !obj[label])
        throw new Error(`'${label}' parameter is required.`);
}

export const sortMealByDate = (a: IMeal, b: IMeal) => {
    if (new Date(a.timestamp) > new Date(b.timestamp)) return -1;
    if (new Date(a.timestamp) < new Date(b.timestamp)) return 1;
    return 0;
}

export const filterTodaysMeals = (meal: IMeal) => moment().diff(moment(meal.timestamp), "days") === 0;