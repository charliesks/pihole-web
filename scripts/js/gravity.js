/* Pi-hole: A black hole for Internet advertisements
 *  (c) 2017 Pi-hole, LLC (https://pi-hole.net)
 *  Network-wide ad blocking via your own hardware.
 *
 *  This file is copyright under the latest version of the EUPL.
 *  Please see LICENSE file for your rights under this license. */
/* global apiUrl: false */

function eventsource() {
  var alInfo = $("#alInfo");
  var alSuccess = $("#alSuccess");
  var ta = $("#output");

  ta.html("");
  ta.show();
  alInfo.show();
  alSuccess.hide();

  fetch(apiUrl + "/action/gravity", {
    method: "POST",
    headers: { "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content") },
  })
    // Retrieve its body as ReadableStream
    .then(response => {
      const reader = response.body.getReader();
      return new ReadableStream({
        start(controller) {
          return pump();
          function pump() {
            return reader.read().then(({ done, value }) => {
              // When no more data needs to be consumed, close the stream
              if (done) {
                controller.close();
                alInfo.hide();
                $("#gravityBtn").prop("disabled", false);
                return;
              }

              // Enqueue the next data chunk into our target stream
              controller.enqueue(value);
              var string = new TextDecoder().decode(value);
              parseLines(ta, string);

              if (string.indexOf("Done.") !== -1) {
                alSuccess.show();
              }

              return pump();
            });
          }
        },
      });
    })
    .catch(error => console.error(error)); // eslint-disable-line no-console
}

$("#gravityBtn").on("click", function () {
  $("#gravityBtn").prop("disabled", true);
  eventsource();
});

// Handle hiding of alerts
$(function () {
  $("[data-hide]").on("click", function () {
    $(this)
      .closest("." + $(this).attr("data-hide"))
      .hide();
  });

  // Do we want to start updating immediately?
  // gravity?go
  var searchString = globalThis.location.search.substring(1);
  if (searchString.indexOf("go") !== -1) {
    $("#gravityBtn").prop("disabled", true);
    eventsource();
  }
});

function parseLines(ta, str) {
  // str can contain multiple lines.
  // We want to split the text before an "OVER" escape sequence to allow overwriting previous line when needed

  // Splitting the text on "\r"
  var lines = str.split(/(?=\r)/g);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i][0] === "\r") {
      // This line starts with the "OVER" sequence. Replace them with "\n" before print
      lines[i] = lines[i].replaceAll("\r[K", "\n").replaceAll("\r", "\n");

      // Last line from the textarea will be overwritten, so we remove it
      ta.text(ta.text().substring(0, ta.text().lastIndexOf("\n")));
    }

    // Append the new text to the end of the output
    ta.append(lines[i]);
  }
}
