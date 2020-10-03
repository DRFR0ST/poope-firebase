import * as functions from 'firebase-functions';
import * as corsPkg from "cors";

const cors = corsPkg({
    origin: true,
});

type ResponseBase = { status: number };
type ResponseSuccess<T> = ResponseBase & { data: T };
type ResponseError = ResponseBase & { message: string };

class FireRequest<T, Q = undefined> {
    state: "initial" | "pending" | "success" | "error" = "initial";
    request: functions.https.Request;
    response: functions.Response<ResponseSuccess<T> | ResponseError>;

    constructor(request: functions.https.Request, response: functions.Response<ResponseSuccess<T> | ResponseError>) {
        this.request = request;
        this.response = response;

        this.onRequest();
        this.state = "pending";
    }

    get query(): Q {
        return this.request.query as unknown as Q;
    }

    onRequest() {
        return;
    }

    onResponse(status: number, data?: any, message?: string) {
        if (this.state !== "pending") return;

        cors(this.request, this.response, () => {
            if (status.toString()[0] === "2") { // ? Maybe just 200 and 204 should pass?
                const resBody = { status, data };
                this.response.send(resBody as ResponseSuccess<T>);
                this.state = "success";
                return;
            }

            this.response.send({ status, message } as ResponseError);
            this.state = "error";
        })
    }
}

export default FireRequest;