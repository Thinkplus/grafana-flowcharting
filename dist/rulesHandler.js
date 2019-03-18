"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _rule_class = _interopRequireDefault(require("./rule_class"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RulesHandler =
/*#__PURE__*/
function () {
  function RulesHandler($scope) {
    _classCallCheck(this, RulesHandler);

    this.$scope = $scope;
    $scope.editor = this;
    this.panelCtrl = $scope.ctrl;
    this.panel = this.panelCtrl.panel;
    this.rules = [];
    this.seq = 1;
    if (this.panelCtrl.version != this.panel.version) this.migrate(this.rules);else this.import(this.rules);
  }

  _createClass(RulesHandler, [{
    key: "backup",
    value: function backup() {
      this.panel.rules = this.export();
    }
  }, {
    key: "export",
    value: function _export() {
      var rules = [];

      _each(this.getRules(), function (rule) {
        rules.push(rule.export());
      });

      return rules;
    }
  }, {
    key: "import",
    value: function _import(obj) {
      _each(this.getRules(), function (rule) {
        var newRule = new _rule_class.default(this.seq++);
        newRule.import(rule);
        this.rules.push(newRule);
      });
    }
  }, {
    key: "migrate",
    value: function migrate(obj) {
      var _this = this;

      _each(this.getRules(), function (rule) {
        var newRule = new _rule_class.default(_this.seq++);
        newRule.migrate(rule);

        _this.rules.push(newRule);
      });
    }
  }, {
    key: "getRules",
    value: function getRules() {
      return this.rules;
    }
  }, {
    key: "getRule",
    value: function getRule(index) {
      return this.rules[index];
    }
  }, {
    key: "addRule",
    value: function addRule() {
      var newRule = new _rule_class.default(this.seq++);
      rules.push(newRule);
    }
  }, {
    key: "removeRule",
    value: function removeRule(rule) {
      this.rules = _.without(this.rules, rule);
    }
  }, {
    key: "cloneRule",
    value: function cloneRule(rule) {
      var newRule = angular.copy(rule);
      newRule.seq = this.seq++;
      var rules = this.rules;
      var rulesCount = rules.length;
      var indexToInsert = rulesCount; // check if last is a catch all rule, then add it before that one

      if (rulesCount > 0) {
        var last = rules[rulesCount - 1];

        if (last.pattern === "/.*/") {
          indexToInsert = rulesCount - 1;
        }
      }

      rules.splice(indexToInsert, 0, newRule);
      this.activeRuleIndex = indexToInsert;
    }
  }, {
    key: "moveRuleToUp",
    value: function moveRuleToUp(index) {
      var first = 0;
      var rules = this.rules;
      var last = rules.length - 1;

      if (index != first && last != first) {
        var curr = rules[index];
        var before = rules[index - 1];
        rules[index - 1] = curr;
        rules[index] = before;
      }
    }
  }, {
    key: "moveRuleToDown",
    value: function moveRuleToDown(index) {
      var first = 0;
      var rules = this.rules;
      var last = rules.length - 1;

      if (index != last && last != first) {
        var curr = rules[index];
        var after = rules[index + 1];
        rules[index + 1] = curr;
        rules[index] = after;
      }
    }
  }]);

  return RulesHandler;
}();

exports.default = RulesHandler;
