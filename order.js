var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: true })
var fs = require('fs');
var options = JSON.parse(fs.readFileSync('.eatclubrc', 'utf8'));

console.log("Using food preferences: " + JSON.stringify(options.preferences));

var checkThDay = function(current_day) {
  console.log('checkThDay call with ' + current_day);
  if (current_day > 5) nightmare.end();

  return nightmare
         .wait('[filter-service="dailyMenuCtrl.menuFilterService"] li.dropdown-item:nth-child(' + current_day + ')')
         .exists('[filter-service="dailyMenuCtrl.menuFilterService"] li.dropdown-item:nth-child(' + current_day + ') .nomicon-check-filled')
         .then(function(presentInDom) {
           if (presentInDom) {
             console.log('day ' + current_day + ' was already processed');
             return checkThDay(current_day+1);
           } else {
             console.log('presentInDom = ' + presentInDom)
             console.log('day ' + current_day + ' NEEDS to be processed');
                       return nightmare
                                .click('[filter-service="dailyMenuCtrl.menuFilterService"] li.dropdown-item:nth-child(' + current_day + ')')
                                .wait(function(current_day) {
                                  return new RegExp($('[filter-service="dailyMenuCtrl.menuFilterService"] [uib-dropdown-toggle]').text().trim()).test(
                                    $('[filter-service="dailyMenuCtrl.menuFilterService"] li.dropdown-item:nth-child(' + current_day + ')').text()
                                  );
                                }, current_day)
                                .wait('.loading-message.ng-hide')
                                .evaluate(function(preferenceOptions, current_day) {
                                  for (var i = 0; i < preferenceOptions.length; i++) {
                                    var expression = 'menu-item:not(:has(.ribbon.soldout))';
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
                                      var $selection = $('[ng-mouseover] .ng-binding:not(.ng-hide):contains(ADD)', candidates.get(0));
                                      dishName = $selection.closest('menu-item').find('.mi-item-name-link').text().trim();
                                      console.log('Picking ' + dishName);
                                      $selection.click();
                                      return dishName;
                                      break;
                                    } else if (preferenceOptions[i].wait_until_days_left && preferenceOptions[i].wait_until_days_left < current_day) {
                                      console.log('Skipping rest of the preferences, since wait_until_days_left=' + preferenceOptions[i].wait_until_days_left + ' for preference index ' + i);
                                      break;
                                    }
                                  }
                                }, options.preferences, current_day)
                                .wait('.cart-checkout-button:not(.ng-hide)')
                                .click('.cart-checkout-button')
                                .wait('.order-confirmation-message:not(.ng-hide)')
                                .then(function() {
                                  return checkThDay(current_day+1);
                                });

           }
         });
};
nightmare
  .on('console', function(type, msg) {
    console.log('CONSOLE.LOG: ' + msg);
   })
nightmare
  .goto('https://www.eatclub.com/accounts/logout')
  .goto('https://www.eatclub.com/login/')
  .type('form [name=email]', options.eatclub_email)
  .type('form [name=password]', options.eatclub_password)
  .click('form [type=submit]')
  .then(function() {
    return checkThDay(1);
  })
  .then(function() {
    console.log('moi');
    return nightmare.end();
  })
  .then(function (result) {
    console.log('moi2');
    console.log(result)
  })
  .catch(function (error) {
    console.error('Search failed:', error);
  });