/* eslint-disable */

export const handleTweet = async () => {
	const div = document.createElement("div");
	/** @type {Element} */
	const article =
		document.body.querySelector('article[role="article"]') ??
		(await new Promise((resolve) =>
			new MutationObserver((_mutations, observer) => {
				const article = document.body.querySelector('article[role="article"]');

				if (article) {
					resolve(article);
					observer.disconnect();
				}
			}).observe(document.body, { childList: true, subtree: true }),
		));
	let /** @type {Node | null} */ thisNode,
		/** @type {Node | undefined} */ lastNode;
	let result = document.evaluate(
		".//a[@role='link' and starts-with(normalize-space(translate(., '\u00A0', ' ')), 'Read ')]",
		article,
		null,
		XPathResult.ORDERED_NODE_ITERATOR_TYPE,
		null,
	);
	while ((thisNode = result.iterateNext())) lastNode = thisNode;
	div.id = "ready";
	const replies = lastNode?.textContent?.match(/^\s*Read (\d\S*)/)?.[1] ?? "0";

	lastNode?.parentElement?.remove();
	result = document.evaluate(
		".//span[text()='Reply']",
		article,
		null,
		XPathResult.ORDERED_NODE_ITERATOR_TYPE,
		null,
	);
	lastNode = undefined;
	while ((thisNode = result.iterateNext())) lastNode = thisNode;
	if (lastNode instanceof HTMLElement) lastNode.innerText = replies;
	result = document.evaluate(
		".//a[@role='link' and normalize-space(translate(., '\u00A0', ' '))='Show more']",
		article,
		null,
		XPathResult.ANY_UNORDERED_NODE_TYPE,
		null,
	);
	if (result.singleNodeValue) result.singleNodeValue.textContent = "...";
	result = document.evaluate(
		".//div[@role='button' and .='Copy link to post']",
		article,
		null,
		XPathResult.ANY_UNORDERED_NODE_TYPE,
		null,
	);
	if (result.singleNodeValue instanceof HTMLElement)
		result.singleNodeValue.remove();
	result = document.evaluate(
		".//div[@aria-hidden='true' and @dir='auto' and .='·']",
		article,
		null,
		XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
		null,
	);
	for (let i = +(result.snapshotLength !== 1); i < result.snapshotLength; i++) {
		thisNode = result.snapshotItem(i);
		if (!(thisNode instanceof Element)) continue;
		const xPathResult = document.evaluate(
			"./a[@role='link' and @dir='auto' and .='Follow']",
			thisNode.parentElement ?? article,
			null,
			XPathResult.ANY_UNORDERED_NODE_TYPE,
			null,
		);

		if (xPathResult.singleNodeValue instanceof Element)
			xPathResult.singleNodeValue.remove();
		thisNode.remove();
	}
	document.body.appendChild(div);
};
