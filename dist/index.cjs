Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
// src/index.ts
if (typeof Promise.withResolvers === "undefined") Promise.withResolvers = () => {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
};
var ChannelClosedError = class extends Error {
	constructor(message = "Cannot perform operation on a closed channel") {
		super(message);
		this.name = "ChannelClosedError";
	}
};
var Channel = class {
	#consumers = /* @__PURE__ */ new Set();
	#closed = false;
	#closeValue = void 0;
	#mode;
	constructor(options = {}) {
		this.#mode = options.mode ?? "raw";
	}
	get closed() {
		return this.#closed;
	}
	get mode() {
		return this.#mode;
	}
	#push(ir) {
		for (const consumer of this.#consumers) if (consumer.resolve !== null) {
			const res = consumer.resolve;
			consumer.resolve = null;
			res(ir);
		} else consumer.buffer.push(ir);
	}
	send(data) {
		if (this.#closed) {
			if (this.#mode === "strict") throw new ChannelClosedError("Cannot send to a closed channel");
			if (this.#mode === "safe") return;
		}
		this.#push({
			done: false,
			value: data
		});
	}
	close(value) {
		if (this.#closed) {
			if (this.#mode === "strict") throw new ChannelClosedError("Channel is already closed");
			if (this.#mode === "safe") return;
		}
		this.#closed = true;
		this.#closeValue = value;
		this.#push({
			done: true,
			value
		});
		this.#consumers.clear();
	}
	[Symbol.asyncIterator]() {
		if (this.#closed && this.#mode !== "raw") {
			const closeValue = this.#closeValue;
			return {
				[Symbol.asyncIterator]() {
					return this;
				},
				next() {
					return {
						done: true,
						value: closeValue
					};
				},
				return(value) {
					return Promise.resolve({
						done: true,
						value
					});
				},
				throw(e) {
					return Promise.reject(e);
				}
			};
		}
		const channel = this;
		const consumer = {
			buffer: [],
			head: 0,
			resolve: null
		};
		this.#consumers.add(consumer);
		return {
			[Symbol.asyncIterator]() {
				return this;
			},
			next() {
				if (consumer.head < consumer.buffer.length) {
					const ir = consumer.buffer[consumer.head];
					consumer.buffer[consumer.head++] = void 0;
					if (consumer.head === consumer.buffer.length) {
						consumer.buffer.length = 0;
						consumer.head = 0;
					}
					return ir;
				}
				const { promise, resolve } = Promise.withResolvers();
				consumer.resolve = resolve;
				return promise;
			},
			return(value) {
				channel.#consumers.delete(consumer);
				consumer.buffer.length = 0;
				return Promise.resolve({
					done: true,
					value
				});
			},
			throw(e) {
				channel.#consumers.delete(consumer);
				consumer.buffer.length = 0;
				return Promise.reject(e);
			}
		};
	}
};

exports.Channel = Channel;
exports.ChannelClosedError = ChannelClosedError;
//# sourceMappingURL=index.cjs.map