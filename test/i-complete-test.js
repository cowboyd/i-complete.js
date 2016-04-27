import IComplete from '../src/i-complete';
import { describe, before, beforeEach, it } from 'mocha';
import { expect } from 'chai';

describe("IComplete", function() {
  let state = null;
  beforeEach(function() {
    state = new IComplete();
  });
  describe("by default", function() {
    it("has an empty query", function() {
      expect(state.query).to.equal('');
    });
    it("has no matches", function() {
      expect(state.matches).to.be.empty;
    });
    it("does not have a value", function() {
      expect(state.value).to.equal(null);
    });
    it("does not have a currently inspected match", function() {
      expect(state.currentMatch.value).to.equal(null);
      expect(state.currentMatch.isNull).to.equal(true);
    });
    it("is not currentlyInspectingMatches", function() {
      expect(state.isInspectingMatches).to.equal(false);
    });
    it("is not pending", function() {
      expect(state.isPending).to.equal(false);
    });
  });

  describe("setting a query", function() {
    beforeEach(function() {
      state = state.setQuery('bob');
    });
    it("has a query", function() {
      expect(state.query).to.equal('bob');
    });
    it("isPending", function() {
      expect(state.isPending).to.equal(true);
    });

    describe("cancelling", function() {
      beforeEach(function() {
        state = state.cancel();
      });
      it("is no longer pending", function() {
        expect(state.isPending).to.equal(false);
      });
      it("resets the query back to its original value", function() {
        expect(state.query).to.equal('');
      });
    });

    describe("when matches are resolved", function() {
      beforeEach(function() {
        state = state.resolve(['bob', 'bob bob', 3]);
      });
      it("is no longer pending", function() {
        expect(state.isPending).to.equal(false);
      });
      it("indicates that it is now inspecting matches", function() {
        expect(state.isInspectingMatches).to.equal(true);
      });
      it("contains the matches", function() {
        expect(state.matches.map(m => m.value)).to.deep.equal(['bob', 'bob bob', 3]);
      });
      it("has the null match as the current match", function() {
        expect(state.currentMatch.value).to.equal(null);
        expect(state.currentMatch.isNull).to.equal(true);
      });
      describe("cancelling", function() {
        beforeEach(function() {
          state = state.cancel();
        });
        it("is no longer inspecting matches", function() {
          expect(state.isInspectingMatches).to.equal(false);
          expect(state.matches).to.deep.equal([]);
        });
      });
      describe("selecting a match directly", function() {
        beforeEach(function() {
          state = state.select();
        });
        it("marks that match as the selection", function() {
          expect(state.value).to.equal(null);
        });
        it("clears out the matches", function() {
          expect(state.matches).to.deep.equal([]);
        });
        it("is no longer inspecting matches", function() {
          expect(state.isInspectingMatches).to.equal(false);
        });
        it("retains the query for that selection", function() {
          expect(state.query).to.equal('');
        });
        it("clears out the current match", function() {
          expect(state.currentMatch.isNull).to.equal(true);
        });
      });

      describe(". Match inspection:", function() {
        describe("inspecting the first match", function() {
          beforeEach(function() {
            state = state.inspectNextMatch();
          });
          it("selects the first value", function() {
            expect(state.currentMatch.value).to.equal('bob');
            expect(state.currentMatch.isCurrentMatch).to.equal(true);
            expect(state.matches[0]).to.equal(state.currentMatch);
          });
          describe(", then inspecting the previous match", function() {
            beforeEach(function() {
              state = state.inspectPreviousMatch();
            });
            it("nulls out the current match", function() {
              expect(state.currentMatch.value).to.equal(null);
              expect(state.currentMatch.isNull).to.equal(true);
            });
          });

          describe(", then inspecting the next match", function() {
            beforeEach(function() {
              state = state.inspectNextMatch();
            });
            it("considers the the next match", function() {
              expect(state.currentMatch.value).to.equal('bob bob');
            });
            it("marks the second match as the current match", function() {
              expect(state.matches[1]).to.equal(state.currentMatch);
            });
          });
        });
      });
      describe("immediately inspecting the previous match", function() {
        beforeEach(function() {
          state = state.inspectPreviousMatch();
        });
        it("considers the last match", function() {
          expect(state.matches[2].isCurrentMatch).to.equal(true);
          expect(state.matches[2]).to.equal(state.currentMatch);
        });
      });
      describe("inspecting past the last match", function() {
        beforeEach(function() {
          state = state
            .inspectNextMatch()
            .inspectNextMatch()
            .inspectNextMatch()
            .inspectNextMatch();
        });
        it("nulls out the current match", function() {
          expect(state.currentMatch.value).to.equal(null);
          expect(state.currentMatch.isNull).to.equal(true);
        });
      });
    });

    describe("when an error occurs", function() {
      beforeEach(function() {
        state = state.reject('courd not communicate with server');
      });
      it("is no longer pending", function() {
        expect(state.isPending).to.equal(false);
      });
      it("is not inspecting matches", function() {
        expect(state.isInspectingMatches).to.equal(false);
      });
    });
  });

  describe("with a constant default match", function() {
    beforeEach(function() {
      state = new IComplete({
        defaultMatch: "iam default"
      }).setQuery("bob")
        .resolve(['first', 'second'])
        .inspectNextMatch()
        .inspectNextMatch()
        .inspectNextMatch();
    });
    it("has the default match as its match value", function() {
      expect(state.currentMatch.value).to.equal("iam default");
    });
  });

  describe("with a function default match", function() {
    beforeEach(function() {
      state = new IComplete({
        defaultMatch: query => `iamdefault 4 ${query}`
      }).setQuery('bob')
        .resolve(['bob'])
        .inspectNextMatch()
        .inspectNextMatch();
    });
    it("passes the query to the function in order to yield its match value", function() {
      expect(state.currentMatch.value).to.equal('iamdefault 4 bob');
      expect(state.currentMatch.isDefault).to.equal(true);
    });
  });

});
