"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// See: https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI
var bytes_1 = require("@ethersproject/bytes");
var errors = __importStar(require("@ethersproject/errors"));
var properties_1 = require("@ethersproject/properties");
var abstract_coder_1 = require("./coders/abstract-coder");
var address_1 = require("./coders/address");
var array_1 = require("./coders/array");
var boolean_1 = require("./coders/boolean");
var bytes_2 = require("./coders/bytes");
var fixed_bytes_1 = require("./coders/fixed-bytes");
var null_1 = require("./coders/null");
var number_1 = require("./coders/number");
var string_1 = require("./coders/string");
var tuple_1 = require("./coders/tuple");
var fragments_1 = require("./fragments");
var paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
var paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);
var AbiCoder = /** @class */ (function () {
    function AbiCoder(coerceFunc) {
        var _newTarget = this.constructor;
        errors.checkNew(_newTarget, AbiCoder);
        properties_1.defineReadOnly(this, "coerceFunc", coerceFunc || null);
    }
    AbiCoder.prototype._getCoder = function (param) {
        var _this = this;
        switch (param.baseType) {
            case "address":
                return new address_1.AddressCoder(param.name);
            case "bool":
                return new boolean_1.BooleanCoder(param.name);
            case "string":
                return new string_1.StringCoder(param.name);
            case "bytes":
                return new bytes_2.BytesCoder(param.name);
            case "array":
                return new array_1.ArrayCoder(this._getCoder(param.arrayChildren), param.arrayLength, param.name);
            case "tuple":
                return new tuple_1.TupleCoder((param.components || []).map(function (component) {
                    return _this._getCoder(component);
                }), param.name);
            case "":
                return new null_1.NullCoder(param.name);
        }
        // u?int[0-9]*
        var match = param.type.match(paramTypeNumber);
        if (match) {
            var size = parseInt(match[2] || "256");
            if (size === 0 || size > 256 || (size % 8) !== 0) {
                errors.throwError("invalid " + match[1] + " bit length", errors.INVALID_ARGUMENT, {
                    arg: "param",
                    value: param
                });
            }
            return new number_1.NumberCoder(size / 8, (match[1] === "int"), param.name);
        }
        // bytes[0-9]+
        match = param.type.match(paramTypeBytes);
        if (match) {
            var size = parseInt(match[1]);
            if (size === 0 || size > 32) {
                errors.throwError("invalid bytes length", errors.INVALID_ARGUMENT, {
                    arg: "param",
                    value: param
                });
            }
            return new fixed_bytes_1.FixedBytesCoder(size, param.name);
        }
        return errors.throwError("invalid type", errors.INVALID_ARGUMENT, {
            arg: "type",
            value: param.type
        });
    };
    AbiCoder.prototype._getWordSize = function () { return 32; };
    AbiCoder.prototype._getReader = function (data) {
        return new abstract_coder_1.Reader(data, this._getWordSize(), this.coerceFunc);
    };
    AbiCoder.prototype._getWriter = function () {
        return new abstract_coder_1.Writer(this._getWordSize());
    };
    AbiCoder.prototype.encode = function (types, values) {
        var _this = this;
        if (types.length !== values.length) {
            errors.throwError("types/values length mismatch", errors.INVALID_ARGUMENT, {
                count: { types: types.length, values: values.length },
                value: { types: types, values: values }
            });
        }
        var coders = types.map(function (type) { return _this._getCoder(fragments_1.ParamType.from(type)); });
        var coder = (new tuple_1.TupleCoder(coders, "_"));
        var writer = this._getWriter();
        coder.encode(writer, values);
        return writer.data;
    };
    AbiCoder.prototype.decode = function (types, data) {
        var _this = this;
        var coders = types.map(function (type) { return _this._getCoder(fragments_1.ParamType.from(type)); });
        var coder = new tuple_1.TupleCoder(coders, "_");
        return coder.decode(this._getReader(bytes_1.arrayify(data)));
    };
    return AbiCoder;
}());
exports.AbiCoder = AbiCoder;
exports.defaultAbiCoder = new AbiCoder();