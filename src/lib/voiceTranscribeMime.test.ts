import assert from "node:assert/strict";
import test from "node:test";

import {
  audioFileExtensionForMime,
  isGroqSupportedAudioMime,
  whisperLanguageFromBcp47,
} from "./voiceTranscribeMime";

test("isGroqSupportedAudioMime rejects 3gpp", () => {
  assert.equal(isGroqSupportedAudioMime("audio/3gpp"), false);
  assert.equal(isGroqSupportedAudioMime("audio/webm"), true);
  assert.equal(isGroqSupportedAudioMime("audio/mp4"), true);
});

test("whisperLanguageFromBcp47", () => {
  assert.equal(whisperLanguageFromBcp47("en-IN"), "en");
  assert.equal(whisperLanguageFromBcp47("hi-IN"), "hi");
});

test("audioFileExtensionForMime", () => {
  assert.equal(audioFileExtensionForMime("audio/mp4"), "m4a");
  assert.equal(audioFileExtensionForMime("audio/webm"), "webm");
});
