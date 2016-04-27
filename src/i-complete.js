class CompletionState {
  constructor(attrs) {
    Object.assign(this, attrs);
  }

  get currentMatch() { return this.nullMatch; }

  get nullMatch() { return new NullMatch(this); }

  get isInspectingMatches() { return false; }

  get isPending() { return false; }
}

class InitialState extends CompletionState {
  constructor(attrs = {}) {
    super({
      query: attrs.query || '',
      value: attrs.value || null,
      reason: attrs.reason || null,
      matches: []
    });
  }

  setQuery(query) {
    return new PendingState(this, query);
  }
}

class PendingState extends CompletionState {
  constructor(initial, query) {
    super({ query, initial });
  }

  get value() { return this.initial.value; }

  get isPending() { return true; }

  setQuery(query) {
    return this.initial.setQuery(query);
  }

  cancel() {
    return this.initial;
  }

  resolve(results) {
    return new InspectingMatches(this, (state)=> {
      return {
        matches: results.map((r, i)=> new Match(state, {
          value: r,
          index: i
        }))
      };
    });
  }

  reject(reason) {
    return new InitialState({
      query: this.query,
      value: this.value,
      reason: reason
    });
  }
}

class InspectingMatches extends CompletionState {
  constructor(pending, change) {
    super({ pending });
    Object.assign(this, change.call(this, this));
  }

  get query() { return this.pending.query; }

  get value() { return this.pending.value; }

  get isInspectingMatches() { return true; }

  get currentMatch() {
    return this.matches.find(m => m.isCurrentMatch) || this.nullMatch;
  }

  cancel() {
    return this.pending.cancel();
  }

  select(match) {
    return new InitialState({
      query: this.query,
      value: match.value
    });
  }

  inspectNextMatch() {
    return new InspectingMatches(this.pending, (state)=> {
      return {
        matches: this.matches.map((m)=> {
          return m === this.currentMatch.next ? m.inspect(state) : m.uninspect(state);
        })
      };
    });
  }

  inspectPreviousMatch() {
    return new InspectingMatches(this.pending, (state)=> {
      return {
        matches: this.matches.map((m)=> {
          return m === this.currentMatch.previous ? m.inspect(state) : m.uninspect(state);
        })
      };
    });
  }
}

class Match {
  constructor(state, attrs = {}, overrides = {}) {
    this.state = state;
    this.attrs = Object.assign({
      isCurrentMatch: false,
      isDefault: false,
      value: null
    }, attrs, overrides);
  }

  get isNull() { return false; }

  get isCurrentMatch() {
    return this.attrs.isCurrentMatch;
  }

  get isDefault() {
    return this.attrs.isDefault;
  }

  get index() {
    return this.attrs.index;
  }

  get value() {
    return this.attrs.value;
  }

  get previous() {
    if (this.index === 0) {
      return this.state.nullMatch;
    } else {
      return this.state.matches[this.index - 1];
    }
  }

  get next() {
    if (this.index === (this.state.matches.length - 1)) {
      return this.state.nullMatch;
    } else {
      return this.state.matches[this.index + 1];
    }
  }

  inspect(state) {
    return new Match(state, this.attrs, {
      isCurrentMatch: true
    });
  }

  uninspect(state) {
    return new Match(state, this.attrs, {
      isCurrentMatch: false
    });
  }
}

export class NullMatch extends Match {
  constructor(state, isCurrentMatch = false) {
    super(state, {
      isCurrentMatch: isCurrentMatch
    });
  }

  get isNull() { return true; }

  get index() { return -1; }

  get value()  { return null; }

  get previous() {
    if (this.state.matches.length === 0) {
      return this;
    } else {
      return this.state.matches[this.state.matches.length - 1];
    }
  }

  get next() {
    if (this.state.matches.length === 0) {
      return this;
    } else {
      return this.state.matches[0];
    }
  }

  inspect(state) {
    return new NullMatch(state, true);
  }

  uninspect(state) {
    return new NullMatch(state, false);
  }
}

export default InitialState;
