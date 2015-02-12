var prefs;
var timer;
var unreadEmailsCount = 0;
var visibleRemindersCount = 0;
var documentTitle = document.title;

var owaIcon = document.createElement("link");
owaIcon.rel = "icon";
owaIcon.type = "image/png";
owaIcon.sizes = "64x64";
owaIcon.href = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAABvUlEQVQ4y6WTz0tUURTHP/e9N04MBqNJQRDYDKK5tEAINxHRsk24sWWL6G+wheImWriYaBVuRHMZGrVxIQ4pxRQtZiU5OjNU2nOycV6D8+bNPS7e/MAZfC38woUL55zPvffc71EiIpxDRlDw6NhjdeswEGA1Nrbjkso5fM47bO6USO6WKP+rgQjyciwY8OxDlpn3ebAMMFUrGjbA0/+/gWEoCJtnJi2nC8wm92mgy65mYSJGvC/SekJTIsQvXWDbPm7e5kexytr3IihAC28eDRDvi3Q20VBwMH2LufEYrx72g/Y/SIkGV3Pn+kXKz0dJZoosff19uokAD4Z7SKz/YupdnsKLUZ4uZiBk8GTsKiPXuukOm8RmvrBX9Lg7EO0EWKbCd4WgRQB/JdZ/svTNZmPbgZAByo+0AYS36UNeT9/k3mCU+ZQNYQu0xjIVG9myX1yX6gQoqlromUzR39tFxq74TdRQ9QQqtVaVJyhF5xMANJD5457yw+PbV7h/I9oEiMDQ5UgLUNP1E9qNVFckZDJYL2iXagxT7m+FVK7Ep6zDx90Sm1kH7WrfyomzrYwEaO+oIivpQlCKqPOO8wknR+1GRWhuAQAAAABJRU5ErkJggg==";
document.head.appendChild(owaIcon);

var img = document.createElement("img");
img.src = owaIcon.href;

function drawIcon(context, x, y, w, h, radius) {
   var r = x + w;
   var b = y + h;
   context.beginPath();
   context.fillStyle = "red";
   context.lineWidth = "1";
   context.moveTo(x + radius, y);
   context.lineTo(r - radius, y);
   context.quadraticCurveTo(r, y, r, y + radius);
   context.lineTo(r, y + h - radius);
   context.quadraticCurveTo(r, b, r - radius, b);
   context.lineTo(x + radius, b);
   context.quadraticCurveTo(x, b, x, b - radius);
   context.lineTo(x, y + radius);
   context.quadraticCurveTo(x, y, x + radius, y);
   context.fill();
}

function generateTabIcon(number) {
   var canvas = document.createElement("canvas");
   canvas.width = img.width;
   canvas.height = img.height;
   var ctx = canvas.getContext("2d");

   ctx.drawImage(img, 0, 0);

   if (number) {
      drawIcon(ctx, 2, -2, 16, 14, 0);
      ctx.font = "bold 10px Arial";
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.fillText(number, 9, 2);
   }

   return canvas.toDataURL("image/png");
}

function setFavicon(count) {
   if (!prefs.updateFavIcon) {
      return;
   }
   var icon = generateTabIcon(Math.min(count, 99));
   var s = document.querySelectorAll("link[rel*='icon'][type='image/png']");

   if (s.length !== 1 || s[0].href !== icon) {
      for (var i = s.length - 1; i >= 0; i--) {
         s[i].remove();
      }
      owaIcon.href = icon;
      document.head.appendChild(owaIcon);
   }
}

function setDocumentTitle(emails, reminders) {
   if (!prefs.updateDocumentTitle) {
      return;
   }
   var countPrefix = "";
   if (emails > 0 || reminders > 0) {
      countPrefix = "(" + emails + "/" + reminders + ") ";
   }
   document.title = countPrefix + documentTitle;
}

function extractNumber(text) {
   if (text) {
      var digits = text.match(/\d/gi);
      if (digits) {
         return parseInt(digits.join(""), 10);
      }
   }
   return 0;
}

function getCountFromNodes(nodes) {
   var count = 0;
   if (nodes) {
      for (var i = nodes.length - 1; i >= 0; i--) {
         count += extractNumber(nodes[i].innerHTML);
      }
   }
   return count;
}

function getItemsWithActiveCount(folder) {
   return folder.querySelectorAll("[id*='.ucount']");
}

function getCountFromFolders(folders) {
   var count = 0;
   for (var i = folders.length - 1; i >= 0; i--) {
      count += getCountFromNodes(getItemsWithActiveCount(folders[i]));
   }
   return count;
}

function countUnreadEmails() {
   var nodes;
   if ((nodes = document.querySelectorAll("#spnUC #spnCV")).length > 0) {
      // OWA 2010
      return getCountFromNodes(nodes);
   }
   if ((nodes = document.querySelectorAll("[aria-label='Folder Pane']")).length > 0) {
      // OWA 2013
      return getCountFromFolders(nodes);
   }
   return 0;
}

function countVisibleReminders() {
   var nodes;
   if ((nodes = document.querySelectorAll("#spnRmT.alertBtnTxt")).length > 0) {
      // OWA 2010
      return extractNumber(nodes[0].innerHTML);
   }
   if ((nodes = document.querySelectorAll("[aria-label='New Notification']")).length > 2) {
      // OWA 2013
      return extractNumber(nodes[3].title);
   }
   if ((nodes = document.querySelectorAll(".o365cs-notifications-notificationCounter")).length > 0) {
      // 365 check
      return extractNumber(nodes[0].innerHTML);
   }
   return 0;
}

function buildNotificationMessage(type, count) {
   return "You have " + count + " new " + type + ((count === 1) ? "" : "s");
}

function buildEmailNotificationMessage(count) {
   return buildNotificationMessage("email", count);
}

function buildReminderNotificationMessage(count) {
   return buildNotificationMessage("reminder", count);
}

function checkForNewMessages() {
   var newUnreadEmailsCount = countUnreadEmails();
   var newVisibleRemindersCount = countVisibleReminders();
   var noChange = (newUnreadEmailsCount === unreadEmailsCount) && (newVisibleRemindersCount === visibleRemindersCount);
   if (noChange) {
      return;
   }
   setFavicon(newUnreadEmailsCount + newVisibleRemindersCount);
   setDocumentTitle(newUnreadEmailsCount, newVisibleRemindersCount);
   if (newUnreadEmailsCount > unreadEmailsCount) {
      self.port.emit("notify", "email", buildEmailNotificationMessage(newUnreadEmailsCount - unreadEmailsCount));
   }
   if (newVisibleRemindersCount > visibleRemindersCount) {
      self.port.emit("notify", "reminder", buildReminderNotificationMessage(newVisibleRemindersCount
            - visibleRemindersCount));
   }

   unreadEmailsCount = newUnreadEmailsCount;
   visibleRemindersCount = newVisibleRemindersCount;
}

function setNewPrefs(newPrefs) {
   prefs = newPrefs;
   if (prefs.delayBetweenChecks < 1) {
      prefs.delayBetweenChecks = 1;
   }
}

function startMonitor() {
   if (timer) {
      clearInterval(timer);
   }
   timer = setInterval(checkForNewMessages, prefs.delayBetweenChecks * 1000);
}

self.port.on("startMonitor", function (newPrefs) {
   setNewPrefs(newPrefs);
   startMonitor();
});

self.port.on("prefChange", function (prefName, newPrefs) {
   if (prefName === "updateFavIcon" && !newPrefs.updateFavIcon) {
      setFavicon(0);
   } else if (prefName === "updateDocumentTitle" && !newPrefs.updateDocumentTitle) {
      setDocumentTitle(0);
   }
   setNewPrefs(newPrefs);
   if (prefName === "delayBetweenChecks") {
      startMonitor();
   }
});

self.port.on("detach", function () {
   clearInterval(timer);
   setFavicon(0);
   setDocumentTitle(0);
});
