;(function($) {

  $.deparam = function( params, coerce ) {
    var decode = decodeURIComponent;
    var obj = {},
      coerce_types = { 'true': !0, 'false': !1, 'null': null };
    
    // Iterate over all name=value pairs.
    $.each( params.replace( /\+/g, ' ' ).split( '&' ), function(j,v){
      var param = v.split( '=' ),
        key = decode( param[0] ),
        val,
        cur = obj,
        i = 0,
        
        // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
        // into its component parts.
        keys = key.split( '][' ),
        keys_last = keys.length - 1;
      
      // If the first keys part contains [ and the last ends with ], then []
      // are correctly balanced.
      if ( /\[/.test( keys[0] ) && /\]$/.test( keys[ keys_last ] ) ) {
        // Remove the trailing ] from the last keys part.
        keys[ keys_last ] = keys[ keys_last ].replace( /\]$/, '' );
        
        // Split first keys part into two parts on the [ and add them back onto
        // the beginning of the keys array.
        keys = keys.shift().split('[').concat( keys );
        
        keys_last = keys.length - 1;
      } else {
        // Basic 'foo' style key.
        keys_last = 0;
      }
      
      // Are we dealing with a name=value pair, or just a name?
      if ( param.length === 2 ) {
        val = decode( param[1] );
        
        // Coerce values.
        if ( coerce ) {
          val = val && !isNaN(val)            ? +val              // number
            : val === 'undefined'             ? undefined         // undefined
            : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
            : val;                                                // string
        }
        
        if ( keys_last ) {
          // Complex key, build deep object structure based on a few rules:
          // * The 'cur' pointer starts at the object top-level.
          // * [] = array push (n is set to array length), [n] = array if n is 
          //   numeric, otherwise object.
          // * If at the last keys part, set the value.
          // * For each keys part, if the current level is undefined create an
          //   object or array based on the type of the next keys part.
          // * Move the 'cur' pointer to the next level.
          // * Rinse & repeat.
          for ( ; i <= keys_last; i++ ) {
            key = keys[i] === '' ? cur.length : keys[i];
            cur = cur[key] = i < keys_last
              ? cur[key] || ( keys[i+1] && isNaN( keys[i+1] ) ? {} : [] )
              : val;
          }
          
        } else {
          // Simple key, even simpler rules, since only scalars and shallow
          // arrays are allowed.
          
          if ( $.isArray( obj[key] ) ) {
            // val is already an array, so push on the next value.
            obj[key].push( val );
            
          } else if ( obj[key] !== undefined ) {
            // val isn't an array, but since a second value has been specified,
            // convert val into an array.
            obj[key] = [ obj[key], val ];
            
          } else {
            // val is a scalar.
            obj[key] = val;
          }
        }
        
      } else if ( key ) {
        // No value was defined, so set something meaningful.
        obj[key] = coerce
          ? undefined
          : '';
      }
    });
    
    return obj;
  };

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
          $('#answer').empty().append("You will measure significance in ", sp, ".");
      },

      delay: 150,

      showDetail: function(el) {
          detail(el).slideDown(this.delay);
      },

      hideDetail: function(el) {
          detail(el).slideUp(this.delay);
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
              $(parser.selector(k)).val(params[k]);
          }
      }
  }

  $(document).ready(function() {
      parseHash();

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
