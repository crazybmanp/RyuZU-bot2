/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ILogger {
	info: (message: string | unknown, ...args: any[]) => void;
	warn: (message: string | unknown, ...args: any[]) => void;
	error: (message: string | unknown, ...args: any[]) => void;
}