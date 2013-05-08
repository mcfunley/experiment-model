;(function($) {

  window.stats = {
      
      difference_of_proportions: function(s1,n1,s2,n2) {
          var difference_under_null = 0;

          var p1 = s1 / n1, p2 = s2 / n2;
          var p_pooled = (s1 + s2) / (n1 + n2);
          var pq = p_pooled * (1 - p_pooled);
          var se = Math.sqrt((pq / n1) + (pq / n2));

          var z = (p1 - p2 - difference_under_null) / se;

          return { z: z, p: this.z_to_p_two_tail(z), p1: p1, p2: p2 };
      },

      z_to_p_two_tail: function(z) {
          return (1 - this.standard_normal_cdf(Math.abs(z))) * 2;
      },

      standard_normal_cdf: function(x) {
          if(x == 0) {
              return 0.5;
          }
          if(x > 0) {
              var b0 = 0.2316419,
                  b1 = 0.319381530,
                  b2 = -0.356563782,
                  b3 = 1.781477937,
                  b4 = -1.821255978,
                  b5 = 1.33027442;
              var t = 1 / (1 + (b0 * x));

              return 1 - this.standard_normal_pdf(x) * (
                  b1* t + 
                  b2 * Math.pow(t, 2) +
                  b3 * Math.pow(t, 3) +
                  b4 * Math.pow(t, 4) + 
                  b5 * Math.pow(t, 5)
              );
          }
          return 1 - this.standard_normal_cdf(-1 * x);
      },

      standard_normal_pdf: function(x) {
          return Math.exp(-1 * (Math.pow(x, 2) / 2)) / Math.sqrt(2 * Math.PI);
      }

  };

  var parser = {
      use_placeholders: true,

      val_or_ph: function(selector) {
          if(this.use_placeholders) {
              return $(selector).val() || $(selector).attr('placeholder');
          }
          return $(selector).val();
      },
   
      selector: function(name) {
          return 'input[name="' + name + '"]';
      },

      inp: function(name, f) {
          var selector = this.selector(name);
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
              return parseInt(v.replace(",", ""));
          });
      }
  };


  function display(text) {
      $("#answer").text(text);
  }

  function set_treatment_conv(value) {
      $('#treatment-conversion').text(
          'Conversion in the treatment group: ' +
          value.toFixed(2) + '%'
      );
  }

  function set_visits_per_bucket(value) {
  }

  function detail(el) {
      return $(el).parents('.question').next('.detail');
  }


  var updater = {
      get_params: function(use_placeholders) {
          parser.use_placeholders = use_placeholders;
          return {
              lift: parser.percent('lift'), 
              conversion: parser.percent('conversion'),
              confidence: parser.percent('confidence'),
              visits: parser.integer('visits'),
              variants:  parser.integer('variants')
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
      
          var treatment_conversion = 
                  params.conversion * (1 + params.lift / 100.0);
          set_treatment_conv(treatment_conversion);
      
          var visits_per_bucket = params.visits / params.variants;
          set_visits_per_bucket(visits_per_bucket);

          var flip = function(conversion_percent) {
              return visits_per_bucket * conversion_percent / 100.0;
          };

          var conversions_control = 0,
              conversions_treatment = 0,
              day = 0;

          var significant = function(control, treatment, visits) {
              var st = stats.difference_of_proportions(
                  control, visits, treatment, visits
              );
          
              var alpha = (100 - params.confidence) / 100.0;
              return st.p < alpha;
          };

          while(true) {
              day++;
              conversions_control += flip(params.conversion);
              conversions_treatment += flip(treatment_conversion);
              var v = visits_per_bucket * day;
              if(significant(conversions_control, conversions_treatment, v)) {
                  return this.displayDays(day);
              }
              if(day > 365*10) {
                  return display("It will take you over a decade to run " +
                                 "this experiment.");
              }
          }
      },

      displayDays: function(days) {
          var d = days + ((days == 1) ? " day" : " days");
          var cls = "long";
          if(days <= 90) {
              cls = "medium";
          }
          if(days <= 30) {
              cls = "short";
          }

          var sp = $('<span id="days" />').addClass(cls);
          sp.text(d);
          $('#answer').empty().append("Measured significance in ", sp, ".");
      },

      delay: 150,

      showDetail: function(el) {
          detail(el).slideDown(this.delay);
      },

      hideDetail: function(el) {
          detail(el).slideUp(this.delay);
      }
  };


  $(document).ready(function() {
      updater.update();

      $('input').bind('focus', function() {
          updater.showDetail(this);
      }).bind('blur', function() {
          updater.hideDetail(this);
      }).bind('input', function(e) {
          updater.update();
      });
  });

})(jQuery);
