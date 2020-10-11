import * as functions from 'firebase-functions';
import * as corsPkg from "cors";

const cors = corsPkg({
    origin: true,
});

type ResponseBase = { status: number };
type ResponseSuccess<T> = ResponseBase & { data: T };
type ResponseError = ResponseBase & { message: string };

/**
 * Sper 
 */
interface IFireRequest<T, Q = undefined> {
    /** State of the request. */
    state: "initial" | "pending" | "success" | "error";
    /** Firebase https Request object */
    readonly request: functions.https.Request;
    /** Firebase Response object. */
    readonly response: functions.Response<ResponseSuccess<T> | ResponseError>;

    /**
     * Query string retrieved from the request.
     */
    readonly query: Q;

    /** Checks for required query strings. Throws an error if a query not provided. */
    parseQuery: () => void;
    /** Processes the request. */
    onRequest: () => void;
    /** Submits a response. */
    onResponse: (status: number, data?: any, message?: string) => void;
}

/**
 * Interface for handing firebase functions https requests.
 * @version 1.0.0
 * @author Mike Eling <mike@eling.cloud>
 */
class FireRequest<T, Q = undefined> implements IFireRequest<T, Q> {
    public state: "initial" | "pending" | "success" | "error" = "initial";
    public request: functions.https.Request;
    public response: functions.Response<ResponseSuccess<T> | ResponseError>;
    public error: Error = undefined as unknown as Error;

    constructor(request: functions.https.Request, response: functions.Response<ResponseSuccess<T> | ResponseError>) {
        this.request = request;
        this.response = response;

        this.init();
    }

    private init() {
        this.state = "pending";

        try {
            this.parseQuery();
            this.onRequest();
        } catch (err) {
            this.onResponse(400, undefined, err.message)
        }
    }

    get query(): Q {
        return this.request.query as unknown as Q;
    }

    parseQuery() {
        return;
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

            this.response.send({ status, message, data: {} } as ResponseError);
            this.state = "error";
        })
    }
}

export default FireRequest;