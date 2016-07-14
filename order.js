var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: true })
var fs = require('fs');
var options = JSON.parse(fs.readFileSync('.eatclubrc', 'utf8'));

console.log("Using food preferences: " + JSON.stringify(options.preferences));

nightmare = nightmare
  .goto('https://www.eatclub.com/accounts/logout')
  .goto('https://www.eatclub.com/login/')
  .type('form [name=email]', options.eatclub_email)
  .type('form [name=password]', options.eatclub_password)
  .click('form [type=submit]')
  .wait('.menu-days-container .day:nth-child(5)')
  .on('console', function(type, msg) {
    console.log('CONSOLE.LOG: ' + msg);
   });

for (var i = 1; i <= 5; i++) {

  // Use closure to preserve local value for current_day
  (function(current_day) {
    // Go to the day view of current_day
    nightmare = nightmare.wait('.menu-days-container .day:nth-child(' + current_day + ')');
    nightmare = nightmare.evaluate(function(current_day) {
      jQuery('.menu-days-container .day:nth-child(' + current_day + ') .day-element').click();
    }, current_day);

    // wait until current_day's menu item is selected and require the checkmark to be hidden (indicates order hasn't been made yet)
    if (nightmare.visible('.menu-days-container .day.selected:nth-child(' + current_day + ')  > .day-box > .day-element .ordered-checkmark.ng-hide')) {
      nightmare = nightmare.wait('.mi-dish-tag');

      // evaluate jQuery in the page
      nightmare = nightmare.evaluate(function(preferenceOptions, current_day) {
        for (var i = 0; i < preferenceOptions.length; i++) {
          var expression = '[ec-menu-item][class=ng-scope]:not(:has(.ribbon.soldout))';
          if (preferenceOptions[i].include) {
            var filter = preferenceOptions[i].include;
            if (typeof(filter) === 'string') { filter = [filter];}
            expression += filter.map(function(e) { return ':contains(' + e + ')'; }).join();
          }
          if (preferenceOptions[i].exclude) {
            var filter = preferenceOptions[i].exclude;
            if (typeof(filter) === 'string') { filter = [filter];}
            expression += filter.map(function(e) { return ':not(:contains(' + e + '))'; }).join();
          }
          console.log(expression);
          var candidates = $(expression);
          console.log('Food including "' + preferenceOptions[i].include + '" excluding "' + preferenceOptions[i].exclude + '" count: ' + candidates.length);
          if (candidates.length > 0) {
            setTimeout(function(){
              var $selection = $('[ng-mouseover]:contains(ADD)', candidates.get(0));
              console.log('Picking ' + $selection.attr('item-name'));
              $selection.click();
            }, 1000);
            break;
          } else if (preferenceOptions[i].wait_until_days_left && preferenceOptions[i].wait_until_days_left < current_day) {
            console.log('Skipping rest of the preferences, since wait_until_days_left=' + preferenceOptions[i].wait_until_days_left + ' for preference index ' + i);
            break;
          }
        }
      }, options.preferences, current_day);
      nightmare = nightmare.wait('.hitAdd_showCart #checkout-btn').evaluate(function() {
          // Hit Checkout!
          console.log('Making order!');
          $('.hitAdd_showCart #checkout-btn').click();
      }, function() {
        this.echo('No edible food, relying on meat backup for this day.');
      });
      nightmare = nightmare.wait('.menu-days-container .day:nth-child(' + current_day + ')  > .day-box > .day-element .ordered-checkmark:not(.ng-hide)', function() {
        this.echo('Order made successfully for day ' + current_day + '!');
      });
    } else {
      console.log("We're good on day " + current_day);
    }
  })(i);
}

nightmare
.end()
.then(function (result) {
  console.log(result)
})
.catch(function (error) {
  console.error('Search failed:', error);
});