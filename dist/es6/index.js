// \0@oxc-project+runtime@0.158.0/helpers/esm/checkPrivateRedeclaration.js
function _checkPrivateRedeclaration(e, t) {
	if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}

// \0@oxc-project+runtime@0.158.0/helpers/esm/classPrivateMethodInitSpec.js
function _classPrivateMethodInitSpec(e, a) {
	_checkPrivateRedeclaration(e, a), a.add(e);
}

// \0@oxc-project+runtime@0.158.0/helpers/esm/classPrivateFieldInitSpec.js
function _classPrivateFieldInitSpec(e, t, a) {
	_checkPrivateRedeclaration(e, t), t.set(e, a);
}

// \0@oxc-project+runtime@0.158.0/helpers/esm/assertClassBrand.js
function _assertClassBrand(e, t, n) {
	if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
	throw new TypeError("Private element is not present on this object");
}

// \0@oxc-project+runtime@0.158.0/helpers/esm/classPrivateFieldSet2.js
function _classPrivateFieldSet2(s, a, r) {
	return s.set(_assertClassBrand(s, a), r), r;
}

// \0@oxc-project+runtime@0.158.0/helpers/esm/classPrivateFieldGet2.js
function _classPrivateFieldGet2(s, a) {
	return s.get(_assertClassBrand(s, a));
}

// src/index.ts
let _Symbol$asyncIterator;
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
var _consumers = /* @__PURE__ */ new WeakMap();
var _closed = /* @__PURE__ */ new WeakMap();
var _closeValue = /* @__PURE__ */ new WeakMap();
var _mode = /* @__PURE__ */ new WeakMap();
var _Channel_brand = /* @__PURE__ */ new WeakSet();
_Symbol$asyncIterator = Symbol.asyncIterator;
var Channel = class {
	constructor(options = {}) {
		var _options$mode;
		_classPrivateMethodInitSpec(this, _Channel_brand);
		_classPrivateFieldInitSpec(this, _consumers, /* @__PURE__ */ new Set());
		_classPrivateFieldInitSpec(this, _closed, false);
		_classPrivateFieldInitSpec(this, _closeValue, void 0);
		_classPrivateFieldInitSpec(this, _mode, void 0);
		_classPrivateFieldSet2(_mode, this, (_options$mode = options.mode) !== null && _options$mode !== void 0 ? _options$mode : "raw");
	}
	get closed() {
		return _classPrivateFieldGet2(_closed, this);
	}
	get mode() {
		return _classPrivateFieldGet2(_mode, this);
	}
	send(data) {
		if (_classPrivateFieldGet2(_closed, this)) {
			if (_classPrivateFieldGet2(_mode, this) === "strict") throw new ChannelClosedError("Cannot send to a closed channel");
			if (_classPrivateFieldGet2(_mode, this) === "safe") return;
		}
		_assertClassBrand(_Channel_brand, this, _push).call(this, {
			done: false,
			value: data
		});
	}
	close(value) {
		if (_classPrivateFieldGet2(_closed, this)) {
			if (_classPrivateFieldGet2(_mode, this) === "strict") throw new ChannelClosedError("Channel is already closed");
			if (_classPrivateFieldGet2(_mode, this) === "safe") return;
		}
		_classPrivateFieldSet2(_closed, this, true);
		_classPrivateFieldSet2(_closeValue, this, value);
		_assertClassBrand(_Channel_brand, this, _push).call(this, {
			done: true,
			value
		});
		_classPrivateFieldGet2(_consumers, this).clear();
	}
	[_Symbol$asyncIterator]() {
		if (_classPrivateFieldGet2(_closed, this) && _classPrivateFieldGet2(_mode, this) !== "raw") {
			const closeValue = _classPrivateFieldGet2(_closeValue, this);
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
		_classPrivateFieldGet2(_consumers, this).add(consumer);
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
				_classPrivateFieldGet2(_consumers, channel).delete(consumer);
				consumer.buffer.length = 0;
				return Promise.resolve({
					done: true,
					value
				});
			},
			throw(e) {
				_classPrivateFieldGet2(_consumers, channel).delete(consumer);
				consumer.buffer.length = 0;
				return Promise.reject(e);
			}
		};
	}
};
function _push(ir) {
	for (const consumer of _classPrivateFieldGet2(_consumers, this)) if (consumer.resolve !== null) {
		const res = consumer.resolve;
		consumer.resolve = null;
		res(ir);
	} else consumer.buffer.push(ir);
}

export { Channel, ChannelClosedError };
//# sourceMappingURL=index.js.map