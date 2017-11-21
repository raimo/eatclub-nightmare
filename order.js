var Nightmare = require('nightmare');
//var nightmare = Nightmare({ show: false, typeInterval: 4, waitTimeout: 2000 })
var nightmare =  Nightmare({ show: false, typeInterval: 4, pollInterval: 1000 }, { 'web-preferences': {'web-security': false} }, { waitTimeout:30000, pollInterval: 1000 });
var fs = require('fs');
var options = JSON.parse(fs.readFileSync('.eatclubrc', 'utf8'));

console.log("Using food preferences: " + JSON.stringify(options.preferences));

var checkThDay = function(current_day) {
  console.log('checkThDay call with ' + current_day);
  if (current_day > 5) nightmare.end();

         //.wait(1000000)
  return nightmare
         .wait('.nomicon-heart.favorites-icon-unchecked.ng-scope')
         .exists('[filter-service="dailyMenuCtrl.menuFilterService"] .hide-for-small-only:nth-child(' + current_day + ') .nomicon-check-filled')
         .then(function(presentInDom) {
           if (presentInDom) {
             console.log('day ' + current_day + ' was already processed');
             return checkThDay(current_day+1);
           } else {
             console.log('presentInDom = ' + presentInDom)
             console.log('day ' + current_day + ' NEEDS to be processed');
                       return nightmare
                                .wait('.collapsible-date-selector')
                                .click('.collapsible-date-selector .hide-for-small-only:nth-child(' + (current_day) + ') [ng-click]')
                                .wait(1000)
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
                                    var candidates = $(expression, '#menu-' + (current_day-1));
                                    console.log("$('" + expression + "')" + ' – Food including "' + preferenceOptions[i].include + (preferenceOptions[i].exclude ? '" excluding "' + preferenceOptions[i].exclude + '"' : '') + ' count: ' + candidates.length);
                                    if (candidates.length > 0) {
                                      var $selection = $('.item-purchase-button .ng-binding:not(.ng-hide):contains(Add)', candidates.get(0));
                                      dishName = $selection.closest('menu-item').find('.item-title').text().trim();
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
                                .wait(1000)
                                .evaluate(function() {
                                  $('.qty-num').val(1);
                                  $('.cart-item-price:contains($):not(:contains($0.00))').parent().parent().find('.cart-item-delete').click();
                                  $('button:contains(Checkout)').click();
                                })
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
  .goto('https://www.eatclub.com/accounts/login/')
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
    return nightmare.end()
  });