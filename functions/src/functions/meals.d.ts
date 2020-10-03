export interface IMeal {
    id: string;
    amount: number;
    timestamp: string;
    author: IAuthor;
}

export interface IAuthor {
    id: string;
    name: string;
    avatar_url: string;
}