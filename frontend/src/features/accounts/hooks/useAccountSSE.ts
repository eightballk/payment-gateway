import React from "react";
import { BACKEND_ENDPOINTS, BASE_URL } from "@/constants/endpoints";
import type { SSEResponse } from "../types/account";

export function useAccountSSE(onMessage: (data: SSEResponse) => void) {
	React.useEffect(() => {
		let es: EventSource | null = null;
		let retryDelay = 3000;
		let retryTimer: ReturnType<typeof setTimeout>;
		let stopped = false;

		function connect() {
			es = new EventSource(`${BASE_URL}${BACKEND_ENDPOINTS.ACCOUNT_ENDPOINT}sse`);

			es.onopen = () => {
				retryDelay = 3000;
			};

			es.onmessage = (e) => {
				const data: SSEResponse = JSON.parse(e.data);
				onMessage(data);
			};

			es.onerror = () => {
				es?.close();
				if (stopped) return;
				retryTimer = setTimeout(connect, retryDelay);
				retryDelay = Math.min(retryDelay * 2, 30000);
			};
		}

		connect();

		return () => {
			stopped = true;
			clearTimeout(retryTimer);
			es?.close();
		};
	}, []);
}
