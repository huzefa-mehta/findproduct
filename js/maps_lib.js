(function (window, undefined) {
	var MapsLib = function (options) {
		var self = this;

		options = options || {};

		this.recordName = options.recordName || "result"; //for showing a count of results
		this.recordNamePlural = options.recordNamePlural || "results";
		this.searchRadius = options.searchRadius || 805; //in meters ~ 1/2 mile

		// the encrypted Table ID of your Fusion Table (found under File => About)
		this.fusionTableId = options.fusionTableId || "",

		// Found at https://console.developers.google.com/
		// Important! this key is for demonstration purposes. please register your own.
		this.googleApiKey = options.googleApiKey || "",

		// name of the location column in your Fusion Table.
		// NOTE: if your location column name has spaces in it, surround it with single quotes
		// example: locationColumn:     "'my location'",
		this.locationColumn = options.locationColumn || "Location";

		// appends to all address searches if not present
		this.locationScope = options.locationScope || "";

		// zoom level when map is loaded (bigger is more zoomed in)
		this.defaultZoom = options.defaultZoom || 11;

		// center that your map defaults to
		this.map_centroid = new google.maps.LatLng(options.map_center[0], options.map_center[1]);

		// marker image for your searched address
		if (typeof options.addrMarkerImage !== 'undefined') {
			if (options.addrMarkerImage != "")
				this.addrMarkerImage = options.addrMarkerImage;
			else
				this.addrMarkerImage = ""
		} else
			this.addrMarkerImage = "images/blue-pushpin.png"

				this.currentPinpoint = google.maps.LatLng(options.map_center[0], options.map_center[1]);
		this.drawSearchRadiusCircle(self.currentPinpoint);
		$("#result_count").html("");

		this.myOptions = {
			zoom : this.defaultZoom,
			center : this.map_centroid,
			mapTypeId : google.maps.MapTypeId.ROADMAP
		};
		this.geocoder = new google.maps.Geocoder();
		this.map = new google.maps.Map($("#map_canvas")[0], this.myOptions);
		window.map = this.map;
		window.deleteMarkers();
		this.globalDist = [];

		// maintains map centerpoint for responsive design
		google.maps.event.addDomListener(self.map, 'idle', function () {
			self.calculateCenter();
		});
		google.maps.event.addDomListener(window, 'resize', function () {
			self.map.setCenter(self.map_centroid);
		});
		
		google.maps.event.addDomListener(self.map, 'zoom_changed', function () {
			//window.alert('zoom_changed')
			window.setTimeout(function() {
			self.setRadius(self.map);
			self.drawSearchRadiusCircle(self.currentPinpoint);
			self.doSearch();
			}, 2000);
		});
		
		
		self.searchrecords = null;

		//reset filters
		$("#search_address").val(self.convertToPlainString($.address.parameter('address')));
		var loadRadius = self.convertToPlainString($.address.parameter('radius'));
		if (loadRadius != "")
			$("#search_radius").val(loadRadius);
		else
			$("#search_radius").val(self.searchRadius);

		$(":checkbox").prop("checked", "checked");
		$("#result_box").hide();

		//-----custom initializers-----
		$("#text_search").val("");
		self.initAutoComplete(self.fusionTableId);
		self.findMe();
		var searchInProgress = 0;
		var prevText = '';
		var prevAddress = '';
		var debug = false;

		//-----end of custom initializers-----

		//run the default search when page loads
		self.doSearch();
		self.displayModSearchCount(0);
		document.getElementById("results_list").style.display = "none";
		if (options.callback)
			options.callback(self);
	};

	//-----custom functions-----
	//-----end of custom functions-----

	MapsLib.prototype.submitSearch = function (whereClause, map) {
		var self = this;
		//get using all filters
		//NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
		//you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
		//for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles
		self.searchrecords = new google.maps.FusionTablesLayer({
				query : {
					from : self.fusionTableId,
					select : self.locationColumn,
					where : whereClause
				},
				styleId : 2,
				templateId : 2
			});
		self.fusionTable = self.searchrecords;
		self.searchrecords.setMap(map);
		//self.getCount(whereClause);
		//document.getElementById('results_list').style.display = "none";
		//self.displayModSearchCount(0);
		//self.getList(whereClause);
		//document.getElementById('results_list').style.display = "none";
	};
	MapsLib.prototype.initAutoComplete = function (tableId) {
		// Retrieve the unique product names using GROUP BY workaround.
		var self = this;
		var queryText = encodeURIComponent(
				"SELECT 'Product', COUNT() " +
				'FROM ' + tableId + " GROUP BY 'Product'");
		var query = new google.visualization.Query(
				'http://www.google.com/fusiontables/gvizdata?tq=' + queryText);

		query.send(function (response) {
			var numRows = response.getDataTable().getNumberOfRows();

			// Create the list of results for display of autocomplete.
			var results = [];
			for (var i = 0; i < numRows; i++) {
				results.push(response.getDataTable().getValue(i, 0));
			}

			// Use the results to create the autocomplete options.
			/*
			function textChange2() {
		      clearTimeout(textChange2.timeout);
			  textChange2.timeout = setTimeout(function() {
			     doSearch();
			  }, 1000)
		    }
			*/
			$('#text_search').autocomplete({
				source : results,
				minLength : 2,
				//change: function(e, u) {
					//textChange2();
				//}
			});
			//$('#test_search').data("ui-autocomplete")._trigger("change");
			//$( '#test_search').autocomplete({
			//      search: function( event, ui ) {this.doSearch();}
			//});
			//$('#text_search').autocomplete("search");
		});
	}

	MapsLib.prototype.setRadius = function (map) {
		var self = this;
		self.searchRadius = 1610;
		if (map.getZoom() == 4)
			self.searchRadius = 1610000;
		else if (map.getZoom() == 5)
			self.searchRadius = 805000;
		else if (map.getZoom() == 6)
			self.searchRadius = 402500;
		else if (map.getZoom() == 7)
			self.searchRadius = 161000;
		else if (map.getZoom() == 8)
			self.searchRadius = 80500;
		else if (map.getZoom() == 9)
			self.searchRadius = 40250;
		else if (map.getZoom() == 10)
			self.searchRadius = 20125;
		else if (map.getZoom() == 11)
			self.searchRadius = 16100;
		else if (map.getZoom() == 12)
			self.searchRadius = 8050;
		else if (map.getZoom() == 13)
			self.searchRadius = 3220;
		else if (map.getZoom() == 14)
			self.searchRadius = 1610;
		else if (map.getZoom() == 15)
			self.searchRadius = 805;
		else if (map.getZoom() == 16)
			self.searchRadius = 400;
	}
	MapsLib.prototype.getgeoCondition = function (address, callback) {
		var self = this;
		if (address !== "") {
			if (address.toLowerCase().indexOf(self.locationScope) === -1) {
				address = address + " " + self.locationScope;
			}
			self.geocoder.geocode({
				'address' : address
			}, function (results, status) {
				if (status === google.maps.GeocoderStatus.OK) {
					self.currentPinpoint = results[0].geometry.location;
					var map = self.map;

					$.address.parameter('address', encodeURIComponent(address));
					$.address.parameter('radius', encodeURIComponent(self.searchRadius));
					map.setCenter(self.currentPinpoint);
					/*
					// set zoom level based on search radius
					if (self.searchRadius >= 1610000)
						map.setZoom(4); // 1,000 miles
					else if (self.searchRadius >= 805000)
						map.setZoom(5); // 500 miles
					else if (self.searchRadius >= 402500)
						map.setZoom(6); // 250 miles
					else if (self.searchRadius >= 161000)
						map.setZoom(7); // 100 miles
					else if (self.searchRadius >= 80500)
						map.setZoom(8); // 100 miles
					else if (self.searchRadius >= 40250)
						map.setZoom(9); // 100 miles
					else if (self.searchRadius >= 16100)
						map.setZoom(11); // 10 miles
					else if (self.searchRadius >= 8050)
						map.setZoom(12); // 5 miles
					else if (self.searchRadius >= 3220)
						map.setZoom(13); // 2 miles
					else if (self.searchRadius >= 1610)
						map.setZoom(14); // 1 mile
					else if (self.searchRadius >= 805)
						map.setZoom(15); // 1/2 mile
					else if (self.searchRadius >= 400)
						map.setZoom(16); // 1/4 mile
					else
						self.map.setZoom(17);
					*/

					if (self.addrMarkerImage != '') {
						self.addrMarker = new google.maps.Marker({
								position : self.currentPinpoint,
								map : self.map,
								icon : self.addrMarkerImage,
								animation : google.maps.Animation.DROP,
								title : address
							});
					}
					var geoCondition = " AND ST_INTERSECTS(" + self.locationColumn + ", CIRCLE(LATLNG" + self.currentPinpoint.toString() + "," + self.searchRadius + "))";
					callback(geoCondition);
					self.drawSearchRadiusCircle(self.currentPinpoint);
				} else {
					alert("We could not find your address: " + status);
					callback('');
				}
			});
		} else {
			callback('');
		}
	};

	MapsLib.prototype.doSearch = function () {
		var self = this;
		var text_search = $("#text_search").val().replace("'", "\\'");
		if (text_search == '') {
			self.clearSearchResultsOnly();
			self.displayModSearchCount(0);
			return;
		}
		if (self.searchInProgress == 1) {return;}
		self.searchInProgress = 1;
		self.clearSearchResultsOnly();
		var address = $("#search_address").val();
		//self.searchRadius = $("#search_radius").val();
		self.setRadius(self.map)
		self.whereClause = self.locationColumn + " not equal to ''";

		//-----custom filters-----
		
		if (text_search != '')
			self.whereClause += " AND 'Product' contains ignoring case '" + text_search + "'";
		else
			self.whereClause += " AND 'Product'=''";

		//-----end of custom filters-----

		self.getgeoCondition(address, function (geoCondition) {
			self.whereClause += geoCondition;
			self.submitSearch(self.whereClause, self.map);
			self.getList(self.whereClause);
		});
		document.getElementById('results_list').style.display = "none";
        self.searchInProgress = 0;
	};

	MapsLib.prototype.reset = function () {
		$.address.parameter('address', '');
		$.address.parameter('radius', '');
		window.location.reload();
	};

	MapsLib.prototype.getInfo = function (callback) {
		var self = this;
		jQuery.ajax({
			url : 'https://www.googleapis.com/fusiontables/v1/tables/' + self.fusionTableId + '?key=' + self.googleApiKey,
			dataType : 'json'
		}).done(function (response) {
			if (callback)
				callback(response);
		});
	};

	MapsLib.prototype.addrFromLatLng = function (latLngPoint) {
		var self = this;
		self.geocoder.geocode({
			'latLng' : latLngPoint
		}, function (results, status) {
			if (status === google.maps.GeocoderStatus.OK) {
				if (results[1]) {
					$('#search_address').val(results[1].formatted_address);
					$('.hint').focus();
					self.doSearch();
				}
			} else {
				alert("Geocoder failed due to: " + status);
			}
		});
	};

	MapsLib.prototype.drawSearchRadiusCircle = function (point) {
		var self = this;
		return;
		if (self.debug == false) {return;}
		var circleOptions = {
			strokeColor : "#4b58a6",
			strokeOpacity : 0.3,
			strokeWeight : 1,
			fillColor : "#4b58a6",
			fillOpacity : 0.05,
			map : self.map,
			center : point,
			clickable : false,
			zIndex : -1,
			radius : parseInt(self.searchRadius)
		};
		self.searchRadiusCircle = new google.maps.Circle(circleOptions);
	};

	MapsLib.prototype.query = function (query_opts, callback) {
		var queryStr = [],
		self = this;
		queryStr.push("SELECT " + query_opts.select);
		queryStr.push(" FROM " + self.fusionTableId);
		// where, group and order clauses are optional
		if (query_opts.where && query_opts.where != "") {
			queryStr.push(" WHERE " + query_opts.where);
		}
		if (query_opts.groupBy && query_opts.groupBy != "") {
			queryStr.push(" GROUP BY " + query_opts.groupBy);
		}
		if (query_opts.orderBy && query_opts.orderBy != "") {
			queryStr.push(" ORDER BY " + query_opts.orderBy);
		}
		if (query_opts.offset && query_opts.offset !== "") {
			queryStr.push(" OFFSET " + query_opts.offset);
		}
		if (query_opts.limit && query_opts.limit !== "") {
			queryStr.push(" LIMIT " + query_opts.limit);
		}
		var theurl = {
			base : "https://www.googleapis.com/fusiontables/v1/query?sql=",
			queryStr : queryStr,
			key : self.googleApiKey
		};
		$.ajax({
			url : [theurl.base, encodeURIComponent(theurl.queryStr.join(" ")), "&key=", theurl.key].join(''),
			dataType : "json"
		}).done(function (response) {
			//console.log(response);
			if (callback)
				callback(response);
		}).fail(function (response) {
			self.handleError(response);
		});
	};

	MapsLib.prototype.handleError = function (json) {
		if (json.error !== undefined) {
			var error = json.responseJSON.error.errors;
			console.log("Error in Fusion Table call!");
			for (var row in error) {
				console.log(" Domain: " + error[row].domain);
				console.log(" Reason: " + error[row].reason);
				console.log(" Message: " + error[row].message);
			}
		}
	};
	MapsLib.prototype.getCount = function (whereClause) {
		var self = this;
		var selectColumns = "Count()";
		self.query({
			select : selectColumns,
			where : whereClause,
			groupby : " GROUP BY 'Store' "
		}, function (json) {
			self.displaySearchCount(json);
		});
	};

	MapsLib.prototype.displaySearchCount = function (json) {
		var self = this;

		var numRows = 0;
		if (json["rows"] != null) {
			numRows = json["rows"][0];
		}
		var name = self.recordNamePlural;
		if (numRows == 1) {
			name = self.recordName;
		}
		$("#result_box").fadeOut(function () {
			$("#result_count").html(self.addCommas(numRows) + " " + name + " found");
		});
		$("#result_box").fadeIn();
	};
	MapsLib.prototype.displayModSearchCount = function (numRows) {
		var self = this;
		var name = self.recordNamePlural;
		if (numRows == 1) {
			name = self.recordName;
		}
		$("#result_box").fadeOut(function () {
			$("#result_count").html(self.addCommas(numRows) + " " + name + " found");
		});
		$("#result_box").fadeIn();
		document.getElementById('results_list').style.display = "none";
	};
	MapsLib.prototype.getList = function (whereClause) {
		var self = this;
		var selectColumns = "'Store', 'Product', 'Price', 'Location'";
		//var selectColumns = "'Store' FROM (SELECT 'Store','Location' FROM  " + self.fusionTableId + ")";
		//queryStr.push("SELECT " + query_opts.select);
		//queryStr.push(" FROM " + self.fusionTableId);
		//whereClause += " GROUP BY Store";

		self.query({
			select : selectColumns,
			where : whereClause,
			groupby : "GROUP BY 'Store'"
		}, function (response) {
			self.displayList(response);
		});
	},

	MapsLib.prototype.displayList = function (json) {
		var self = this;
		var data = json['rows'];
		var template = '';

		var results = $('#results_list');
		//var distance;
		results.hide().empty(); //hide the existing list and empty it out first
		document.getElementById('results_list').style.display = "none";
		

		if (data == null) {
			//clear results list
			results.append("<li><span class='lead'>No results found</span></li>");
			//document.getElementById('results_list').style.display = "none";
			self.displayModSearchCount(0);
			results.hide();
		} else {
			var myStoreArray = new Array;
			for (var row in data) {

				if (myStoreArray[data[row][3]]) {
					var myStoreArrayLoc = myStoreArray[data[row][3]];
					var myStoreProductArray = new Array;
					myStoreProductArray.push(myStoreArrayLoc[1]);
					myStoreProductArray.push(data[row][1]);
					var minPrice = Math.min(myStoreArrayLoc[4], data[row][2]);
					var maxPrice = Math.max(myStoreArrayLoc[5], data[row][2]);

					//myStoreArrayLoc[1].push(data[row][1]);
					myStoreArray[data[row][3]] = [data[row][0], myStoreProductArray, data[row][2], data[row][3], minPrice, maxPrice];
				} else {
					var myStoreProductArray = new Array;
					myStoreProductArray.push(data[row][1]);
					myStoreArray[data[row][3]] = [data[row][0], myStoreProductArray, data[row][2], data[row][3], data[row][2], data[row][2]];
				}

			}
			var destinations = new Array;
			var origins = new Array;
			var distances = [];
			var durations = new Array;
			for (var row in myStoreArray) {
				destinations.push(myStoreArray[row][3]);
			}
			if ($("#search_address").val() != "") {
				origins.push($("#search_address").val());
			} else {
				origins.push(self.map.getCenter());
			}
			// TODO - remove double loading of this function
			var service = new google.maps.DistanceMatrixService;
			service.getDistanceMatrix({
				origins : origins,
				destinations : destinations,
				travelMode : google.maps.TravelMode.DRIVING,
				unitSystem : google.maps.UnitSystem.IMPERIAL,
				avoidHighways : false,
				avoidTolls : false
			}, function (response, status) {
				if (status !== google.maps.DistanceMatrixStatus.OK) {
					alert('Error was: ' + status);
				} else {
					var originList = response.originAddresses;
					var destinationList = response.destinationAddresses;

					var resultsx = response.rows[0];

					for (var j = 0; j < destinationList.length; j++) {
						distances.push(resultsx.elements[j].distance.text);
						durations.push(resultsx.elements[j].duration.text);

					}
					var Price = '';
					var Product = '';
					var Count = 0;
					var Distance = '';
					var Duration = '';
					var template = '';
					template = "<small><table border='\"1\" style=\"width:100%\"'>\
								<strong><th>Store</th><th>Product</th><th>Price</th><th>Dist/Time</th>";
					for (var row in myStoreArray) {

						Distance = distances[Count];
						Duration = durations[Count];
						Price = "$" + myStoreArray[row][2];
						if (myStoreArray[row][4] != myStoreArray[row][5]) {
							Price = "$" + myStoreArray[row][4] + "..$" + myStoreArray[row][5];
						}
						
						if ((myStoreArray[row][2] == 'NaN') || (myStoreArray[row][4] == '') || (myStoreArray[row][5] == '')) {
							Price = "In Store";
						}
						Product = myStoreArray[row][1];
						if (myStoreArray[row][1].length != 1) {
							Product = "Multiple matches of " + $("#text_search").val() + " found";
						}
						template = template.concat("<tr>\
								          <td><strong><a href='javascript:centerOn(\"" + myStoreArray[row][3] + "\",\"" + myStoreArray[row][0] + "\",\"" + myStoreArray[row][1] + "\",\"" + Price + "\")'>" + myStoreArray[row][0] + "</a></strong></td>\
								              <td>" + Product + "</td><td>" + Price + "</td>\
											  <td>" + Distance + "/" + Duration + "</td>\
											  </tr>");
						/*
						template = "<small>\
						<div class='row-fluid item-list'>\
						<div class='span12'><tr>\
						<td><strong><a href='javascript:centerOn(\"" + myStoreArray[row][3] + "\",\"" + myStoreArray[row][0] + "\",\"" + myStoreArray[row][1] + "\",\"" + Price + "\")'>" + myStoreArray[row][0] + "</a></strong></td>\
						<td>" + Distance + " " + Duration + "</td>\
						<td>" + Product + "</td><td>" + Price + "</td>\
						<br /></tr>\
						</div>\
						</div></small>";
						 */
						Count = Count + 1;

					}
					template = template.concat("</table></small>");
					results.append(template);
					//window.alert(template);

					self.displayModSearchCount(Count);

				}

			});
			/*
			var Price = '';
			var Product = '';
			var Count = 0;
			var Distance = '';
			var Duration = '';
			window.alert(self.globalDist.length);
			//window.alert(distances.length);
			for (var row in myStoreArray) {

			Distance = distances[Count] + "mi";
			Duration = durations[Count] + "hr";
			Price = "$" + myStoreArray[row][2];
			if (myStoreArray[row][4] != myStoreArray[row][5]) {
			Price = "$" + myStoreArray[row][4] + "..$" + myStoreArray[row][5];
			}
			Product = myStoreArray[row][1];
			if (myStoreArray[row][1].length != 1) {
			Product = "Multiple matches of " + $("#text_search").val() + " found";
			}
			template = "<small>\
			<div class='row-fluid item-list'>\
			<div class='span12'>\
			<strong><a href='javascript:centerOn(\"" + myStoreArray[row][3] + "\",\"" + myStoreArray[row][0] + "\",\"" + myStoreArray[row][1] + "\",\"" + Price + "\")'>" + myStoreArray[row][0] + "</a></strong>\
			" + Distance + " " + Duration + "\
			<br />\
			" + Product + " " + Price + "\
			<br />\
			</div>\
			</div></small>";
			Count = Count + 1;
			results.append(template);
			}
			self.displayModSearchCount(Count);
			 */
			/*
			for (var row in data) {
			//https://maps.googleapis.com/maps/api/distancematrix/
			template = "<small>\
			<div class='row-fluid item-list'>\
			<div class='span12'>\
			<strong><a href='javascript:centerOn(\"" + data[row][3] + "\")'>" + data[row][0] + "</a></strong>\
			<br />\
			" + data[row][1] + " $" + data[row][2] + "\
			<br />\
			</div>\
			</div></small>";
			results.append(template);
			}
			 */
		}
		//results.fadeIn();
		results.hide();
		document.getElementById('results_list').style.display = "none";
	},
	MapsLib.prototype.setCenter = function (pos) {
		var self = this;
		self.map.setCenter(pos);
	};
	MapsLib.prototype.addCommas = function (nStr) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	// maintains map centerpoint for responsive design
	MapsLib.prototype.calculateCenter = function () {
		var self = this;
		center = self.map.getCenter();
	};

	//converts a slug or query string in to readable text
	MapsLib.prototype.convertToPlainString = function (text) {
		if (text === undefined)
			return '';
		return decodeURIComponent(text);
	};

	MapsLib.prototype.clearSearch = function () {
		var self = this;
		window.deleteMarkers();
		$('#results_list').hide().empty(); //hide the existing list and empty it out first
		$('#results_box').hide().empty(); //hide the existing list and empty it out first
		$('#results_count').hide().empty(); //hide the existing list and empty it out first
		document.getElementById('results_list').style.display = "none";
		if (self.searchrecords && self.searchrecords.getMap)
			self.searchrecords.setMap(null);
		if (self.addrMarker && self.addrMarker.getMap)
			self.addrMarker.setMap(null);
		if (self.searchRadiusCircle && self.searchRadiusCircle.getMap)
			self.searchRadiusCircle.setMap(null);
	};
	MapsLib.prototype.clearSearchResultsOnly = function () {
		var self = this;
		window.deleteMarkers();
		$('#results_list').hide().empty(); //hide the existing list and empty it out first
		$('#results_box').hide().empty(); //hide the existing list and empty it out first
		$('#results_count').hide().empty(); //hide the existing list and empty it out first
		document.getElementById('results_list').style.display = "none";
		if (self.searchrecords && self.searchrecords.getMap)
			self.searchrecords.setMap(null);
		//if (self.addrMarker && self.addrMarker.getMap)
			//self.addrMarker.setMap(null);
		if (self.searchRadiusCircle && self.searchRadiusCircle.getMap)
			self.searchRadiusCircle.setMap(null);
	};

	MapsLib.prototype.findMe = function () {
		var self = this;
		var foundLocation;
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
				var latitude = position.coords.latitude;
				var longitude = position.coords.longitude;
				var accuracy = position.coords.accuracy;
				var coords = new google.maps.LatLng(latitude, longitude);
				self.map.panTo(coords);
				self.addrFromLatLng(coords);
				self.map.setZoom(14);
				jQuery('#map_canvas').append('<div id="myposition"><i class="fontello-target"></i></div>');
				setTimeout(function () {
					jQuery('#myposition').remove();
				}, 3000);
			}, function error(msg) {
				alert('Please enable your GPS position future.');
			}, {
				//maximumAge: 600000,
				//timeout: 5000,
				enableHighAccuracy : true
			});
		} else {
			alert("Geolocation API is not supported in your browser.");
		}
	};
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = MapsLib;
	} else if (typeof define === 'function' && define.amd) {
		define(function () {
			return MapsLib;
		});
	} else {
		window.MapsLib = MapsLib;
	}

})(window);
