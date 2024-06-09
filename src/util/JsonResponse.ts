export class JsonResponse extends Response {
	constructor(body: unknown, init?: ResponseInit) {
		super(JSON.stringify(body), {
			headers: {
				"content-type": "application/json;charset=UTF-8",
			},
			...init,
		});
	}
}
