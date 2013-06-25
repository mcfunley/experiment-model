;(function($) {

  String.prototype.commafy = function() {
      return this.replace(/(.)(?=(.{3})+$)/g,"$1,");
  };

  
  var formats = {
      percent: function(v) {
          return v.replace(/%/g, '') + '%';
      },

      digits: function(v) {
          return v.replace(/,/g, '').commafy();
      }
  };

  $.fn.applyFormat = function() {
      var f = this.data('format');
      var v = this.val().trim();
      if(v) {
          this.val(formats[f](v));
      }
  };

  window.stats = {

      days_required: function(visits, percent, conversion, lift, 
                              confidence, power) {
          var p1 = conversion / 100;
          var p2 = conversion / 100 * (1 + lift / 100);
          var alpha = (100 - confidence) / 100;
          var r = percent / (100 - percent);
          var ss = this.cps_ssize(p1, p2, alpha, power / 100, r);
          
          var treatment_per_day = visits * (percent / 100);
          var days = Math.ceil(ss.group2 / treatment_per_day);
          return days;
      },

      // Casagrande, Pike & Smith sample size (two sided)
      // http://www.bios.unc.edu/~mhudgens/bios/662/2008fall/casagrande.pdf
      cps_ssize: function(p1, p2, alpha, power, r) {
          var za = this.qnorm(1 - alpha / 2);
          var zb = this.qnorm(power);
          var p = (p1 + r*p2) / (1 + r);
          var n = za * Math.sqrt((1 + r) * p * (1 - p)) + 
                   zb * Math.sqrt(r * p1 * (1 - p1) + p2 * (1 - p2));
          var m1 = Math.pow(n, 2) / Math.pow(r * (p1 - p2), 2);
          var m = (
              (m1 / 4) * 
              Math.pow(
                  1 + Math.sqrt(1 + 2 * (r + 1) / 
                                (m1 * r * Math.abs(p1 - p2)))
                  , 2)
          );
          return { group1: Math.ceil(m), group2: Math.ceil(m * r) };
      },

      // From Wichura, Algorithm AS 241: The Percentage Points of the 
      // Normal Distribution
      // http://www-personal.umich.edu/~jiankang/papers/paper/qnorm.pdf
      qnorm : function(p) {
          var a = [
              3.3871328727963666080, 133.14166789178437745,
              1971.5909503065514427, 13731.693765509461125,
              45921.953931549871457, 67265.770927008700853,
              33430.575583588128105, 2509.0809287301226727
          ];
          var b = [
              42.313330701600911252, 687.18700749205790830,
              5394.1960214247511077, 21213.794301586595867,
              39307.895800092710610, 28729.085735721942674,
              5226.4952788528545610
          ];
          var c = [
              1.42343711074968357734, 4.63033784615654529590,
              5.76949722146069140550, 3.64784832476320460504,
              1.27045825245236838258, 0.241780725177450611770,
              0.0227238449892691845833, 0.000774545014278341407640
          ];
          var d = [
              2.05319162663775882187, 1.67638483018380384940,
              0.689767334985100004550, 0.148103976427480074590,
              0.0151986665636164571966, 0.000547593808499534494600,
              1.05075007164441684324*1e-9
          ];
          var e = [
              6.65790464350110377720, 5.46378491116411436990,
              1.78482653991729133580, 0.296560571828504891230,
              0.0265321895265761230930, 0.00124266094738807843860,
              0.0000271155556874348757815, 2.01033439929228813265*1e-7
          ];
          var f = [
              0.599832206555887937690, 0.136929880922735805310,
              0.0148753612908506148525, 0.000786869131145613259100, 
              1.84631831751005468180*1e-5, 1.42151175831644588870*1e-7,
              2.04426310338993978564*1e-15
          ];
    
          function term(r, xs) {
              if(xs.length == 1) {
                  return xs;
              }
              return xs[0] + r * term(r, xs.slice(1)); 
          }

          function sign(x) {
              return (x < 0 ? -1 : (x > 0 ? 1 : 0));
          }
    
          var r;
          var q = p - 0.5; 
          if(Math.abs(q) <= 0.425) {
              r = 180625/1e6 - q*q;
              return q * term(r, a) / (1 + r * term(r, b));
          }
    
          r = q < 0 ? p : 1 - p;
    
          if(r <= 0) {
              return 0;
          }
    
          r = Math.sqrt(-Math.log(r));
          if(r <= 5) {
              r -= 1.6;
              return sign(q) * term(r, c) / (1 + r * term(r, d));
          }

          r -= 5;
          return sign(q) * term(r, e) / (1 + r * term(r, f));
      },

      qnorm_test : function() {
          // test cases for the three branches of qnorm
          var tests = [
              [0.25, -0.6744897501960817],
              [0.001, -3.090232306167814],
              [1e-20, -9.262340089798408]
          ];
          var epsilon = 1e-12;
          _.each(tests, function(t) {
              var qn = qnorm(t[0]);
              var ok = Math.abs(qn - t[1]) < epsilon;
              console.log(
                  "qnorm(" + t[0] + ") == " + t[1] + " --> " + 
                      (ok ? "OK" : "FAILED (" + qn + ")"));
          });
      }

  };

  function input_selector(name) {
      return 'input[name="' + name + '"]';
  }

  var parser = {
      use_placeholders: true,

      val_or_ph: function(selector) {
          if(this.use_placeholders) {
              return $(selector).val() || $(selector).attr('placeholder');
          }
          return $(selector).val();
      },
   
      inp: function(name, f) {
          var selector = input_selector(name);
          $(selector).removeClass('error');
          var v = this.val_or_ph(selector);
          if(v) {
              try {
                  v = f(v);
                  if(v !== null) {
                      return v;
                  }
              } catch (e) { }
          }
          if(this.use_placeholders) {
              $(selector).addClass('error');
          }
          return null;
      },

      percent: function(name) {
          return this.inp(name, function(v) {
              var m = /([+-]?[0-9.]+)%?/.exec(v);
              if(m) {
                  return parseFloat(m[1]);
              }
              return null;
          });
      },

      integer: function(name) {
          return this.inp(name, function(v) {
              return parseInt(v.replace(/,/g, ""));
          });
      }
  };


  var secondary_calcs = function(params) {
      function lift_tips() {
          var treatment_conv = params.conversion * (1 + params.lift / 100.0);
          var daily_conv = Math.round(params.visits*treatment_conv / 100);
          var daily_abs_conv = Math.round(
              params.visits*(treatment_conv - params.conversion) / 100);

          $('#treatment-conversion').text(
              'Conversion in the treatment group: ' +
                  treatment_conv.toFixed(2) + '%'
          );
          $('#treatment-daily-conv').text(
              'Total daily conversions with the treatment rate: ' +
                  daily_conv
          );

          if(daily_abs_conv > 0) {
              daily_abs_conv = '+' + daily_abs_conv;
          }
          $('#treatment-conv-diff').text(
              'Change in daily conversions: ' + daily_abs_conv 
          );
      }

      function percentage_tips() {
          var treatment_visits = params.visits * params.percentage / 100.0;
          $('#visits-seeing-change').text(
              'Visits per day seeing the change: ' + treatment_visits
          );
      }

      function highlight(x) {
          return $('<span class="secondary-calc" />').text(x);
      }

      function confidence_tips() {
          var c = params.confidence;
          $('#confidence-detail').empty().append(
              'In the case that there really is no effect, there is a ',
              highlight(100 - c + '%'), 
              ' probability that you will think there is one anyway due to random chance.'
          );
      }

      function conversion_tips() {
          var conv = params.visits * params.conversion / 100;
          $('#converting-visitors').text('Converting visitors per day: ' + conv);
      }

      function power_tips() {
          var beta = (100 - params.power);
          $('#power-detail').empty().append(
              'In the case that the effectis real, there is a ',
              highlight(beta + '%'),
              ' chance that your experiment will fail to see it.'
          );
      }

      var x = {
          update: function() {
              conversion_tips();
              confidence_tips();
              percentage_tips();
              lift_tips();
              power_tips();
          }
      };

      return x;
  };

  var validator = {
      validated: false,

      validate: function(params) {
          this.validated = true;

          this.enforcePositive('visits', params);
          this.enforcePositive('percentage', params);
          this.enforcePositive('conversion', params);
          this.enforceNonzero('lift', params);
          this.enforcePositive('confidence', params);
          this.enforcePositive('power', params);

          if(!this.validated) {
              $('#answer').empty().append(
                  '<span class="error">',
                  "Validation error!",
                  '</span>'
              );
          }

          return this.validated;
      },

      enforcePositive: function(input, params) {
          this.toggleError(input, params[input] > 0,
                           'Please enter a positive number.');
      },

      enforceNonzero: function(input, params) {
          this.toggleError(input, params[input] !== null && params[input] != 0, 
                           'Please enter a nonzero number.');
      },

      toggleError: function(input, condition, message) {
          var inp = $(input_selector(input)); 
          var q = inp.parents('.question');
          var e = q.nextAll('.error').first();

          if(!condition) {
              this.validated = false;

              updater.hideDetail(inp);
              e.find('.message').text(message);
              q.addClass('validation-error');
              if(!e.is(':visible')) {
                  e.slideDown(150);
              }
          } else {
              q.removeClass('validation-error');
              if(e.is(':visible')) {
                  e.slideUp(150);
              }
              if(inp.is(':focus')) {
                  updater.showDetail(inp);
              }
          }
      }

  };


  var updater = {
      get_params: function(use_placeholders) {
          parser.use_placeholders = use_placeholders;
          return {
              lift: parser.percent('lift'), 
              conversion: parser.percent('conversion'),
              confidence: parser.percent('confidence'),
              visits: parser.integer('visits'),
              percentage:  parser.percent('percentage'),
              power: parser.percent('power')
          };
      },

      updateHash: function() {
          var params = this.get_params(false);
          for(var k in params) {
              if(params.hasOwnProperty(k) && params[k] === null) {
                  delete params[k];
              }
          }
          if(_.size(params)) {
              window.location.hash = $.param(params);
          } else if (window.location.hash.length > 0) {
              window.location.hash = "";
          }
      },

      update: function() {
          var params = this.get_params(true);
          this.updateHash();

          if(!validator.validate(params)) {
              return false;
          }

          var s = new secondary_calcs(params);
          s.update();

          var days = stats.days_required(
              params.visits, params.percentage, params.conversion,
              params.lift, params.confidence, params.power
          );
          this.displayDays(days);
          return true;
      },

      displayDays: function(days) {
          var flags = countdown.YEARS | countdown.MONTHS | countdown.DAYS;
          if(days < 365/2) {
              flags = countdown.DAYS;
          }

          var cls = "long";
          if(days <= 90) {
              cls = "medium";
          }
          if(days <= 30) {
              cls = "short";
          }

          var c = countdown(new Date(2000,0,1), new Date(2000,0,1+days), flags);
          var d = c.toString();
          var m = /^([0-9]+ months),( and [0-9]+ days)/.exec(d);
          if(m) {
              d = m[1] + m[2];
          }

          var sp = $('<span id="days" />').addClass(cls);
          sp.text(d);
          $('#answer').empty().append("You should run this experiment for ", sp, ".");
      },


      delay: 150,

      detail: function(el) {
          return $(el).parents('.question').nextAll('.detail').first();
      },

      showDetail: function(el) {
          var d = this.detail(el);
          if(!d.closest('.error').is(':visible')) {
              d.slideDown(this.delay);
          }
          return true;
      },

      hideDetail: function(el) {
          var d = this.detail(el);
          if(d.is(':visible')) {
              d.slideUp(this.delay);
          }
          return true;
      }
  };


  function parseHash() {
      var h = window.location.hash;
      if(h.length === 0) {
          return;
      }
      if(_.first(h) === "#") {
          h = h.slice(1);
      }
      if(h.length === 0) {
          return;
      }
      
      var params = $.deparam(h);
      for(var k in params) {
          if(params.hasOwnProperty(k)) {
              $(input_selector(k)).val(params[k]);
          }
      }
  }

  function setupDetails() {
      $('input').bind('focus', function() {
          return updater.showDetail(this);
      }).bind('blur', function() {
          return updater.hideDetail(this);
      }).bind('input', function(e) {
          return updater.update();
      });
  }

  function formatAll() {
      $('input').each(function() { $(this).applyFormat(); });
  }


  function setupValidation() {
      $('input').blur(function() { 
          $(this).applyFormat(); 
          return true;
      });
  }

  $(document).ready(function() {
      parseHash();
      formatAll();
      setupValidation();
      updater.update();
      setupDetails();
  });

})(jQuery);
