(function (window, undefined) {
	var MapsLib = function (options) {
		var self = this;

		options = options || {};

		this.recordName = options.recordName || "result"; //for showing a count of results
		this.recordNamePlural = options.recordNamePlural || "results";
		this.searchRadius = options.searchRadius || 12000; //in meters ~ 1/2 mile

		// the encrypted Table ID of your Fusion Table (found under File => About)
		this.fusionTableId = options.fusionTableId || "";

		// Found at https://console.developers.google.com/
		// Important! this key is for demonstration purposes. please register your own.
		this.googleApiKey = options.googleApiKey || "";

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
			if (options.addrMarkerImage != "") {
				this.addrMarkerImage = options.addrMarkerImage;
			} else {
				this.addrMarkerImage = "";
			}
		} else {
			this.addrMarkerImage = "images/blue-pushpin.png";
		}

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
		var prevZoom = this.defaultZoom;
		var zoomSearchInProgress = false;
		var centerSearchInProgress = false;
		var prevCenter = self.map.getCenter();

		google.maps.event.addDomListener(self.map, 'zoom_changed', function () {
			if (zoomSearchInProgress) {
				return;
			}
			zoomSearchInProgress = true;
			setTimeout(function () {

				self.setRadius(self.map);
				self.drawSearchRadiusCircle(self.currentPinpoint);
				self.doSearch();
			}, 3000);

			zoomSearchInProgress = false;
		});
		google.maps.event.addDomListener(self.map, 'center_changed', function () {

			//window.alert((Math.abs(prevCenter.lat() - self.map.getCenter().lat())*100/self.map.getCenter().lat()));
			//window.alert((Math.abs(prevCenter.lng() - self.map.getCenter().lng())*100/self.map.getCenter().lng()));
			if ((Math.abs((prevCenter.lat() - self.map.getCenter().lat()) * 100 / self.map.getCenter().lat()) < 0.05) ||
				(Math.abs((prevCenter.lng() - self.map.getCenter().lng()) * 100 / self.map.getCenter().lng()) < 0.05)) {
				return;
			}

			if (centerSearchInProgress) {
				return;
			}
			prevCenter = self.map.getCenter();

			centerSearchInProgress = true;
			setTimeout(function () {

				self.map.setCenter(self.map.getCenter());

				self.drawSearchRadiusCircle(self.map.getCenter());
				self.doSearch();
			}, 3000);

			centerSearchInProgress = false;
		});

		self.searchrecords = null;

		//reset filters
		$("#search_address").val(self.convertToPlainString($.address.parameter('address')));

		$("#result_box").hide();

		//-----custom initializers-----
		$("#text_search").val("");

		var search_address = querySt("search_address");
		var text_search = querySt("text_search");
		
		if ((text_search != '') && (text_search !== undefined)) {
			$("#text_search").val(text_search);
		}
		if ((search_address != '') && (search_address !== undefined)) {
			$("#search_address").val(search_address);
			self.getgeoConditionInit(search_address, function () {});
		} else {
			self.findMe();
		}
		self.initAutoComplete(self.fusionTableId);

		var searchInProgress = false;
		var prevText = '';
		var prevAddress = '';

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
	};
	MapsLib.prototype.initAutoComplete = function (tableId) {
		// Retrieve the unique product names using GROUP BY workaround.
		var self = this;
		var queryText = encodeURIComponent(
				"SELECT 'Product', COUNT() " +
				'FROM ' + tableId + " GROUP BY 'Product'");

		var queryStr = [];
		var geoConditionAutocomplete = '';
		var searchR = 4 * self.searchRadius;
		geoConditionAutocomplete = " WHERE ST_INTERSECTS(" + self.locationColumn + ", CIRCLE(LATLNG" + self.map.getCenter().toString() + "," + searchR + "))";
		//window.alert(geoConditionAutocomplete);
		//geoConditionAutocomplete = '';
		queryStr.push("SELECT 'Product', COUNT() FROM " + tableId + geoConditionAutocomplete + " GROUP BY 'Product'")

		var theurl = {
			base : "https://www.googleapis.com/fusiontables/v2/query?sql=",
			queryStr : queryStr,
			key : self.googleApiKey
		};
		$.ajax({
			url : [theurl.base, encodeURIComponent(theurl.queryStr.join(" ")), "&key=", theurl.key].join(''),
			dataType : "json"
		}).done(function (response) {

			var numRows = response.rows.length;

			// Create the list of results for display of autocomplete.
			var results = [];
			for (var i = 0; i < numRows; i++) {
				results.push(response.rows[i][0]);
			}

			// Use the results to create the autocomplete options.

			$('#text_search').autocomplete({
				source : results,
				minLength : 2,

			});

		}).fail(function (response) {
			self.handleError(response);
		});

	}

	MapsLib.prototype.setRadius = function (map) {
		var self = this;
		self.searchRadius = 12000;
		if (map.getZoom() == 4)
			self.searchRadius = 1536000;
		else if (map.getZoom() == 5)
			self.searchRadius = 768000;
		else if (map.getZoom() == 6)
			self.searchRadius = 384000;
		else if (map.getZoom() == 7)
			self.searchRadius = 192000;
		else if (map.getZoom() == 8)
			self.searchRadius = 96000;
		else if (map.getZoom() == 9)
			self.searchRadius = 48000;
		else if (map.getZoom() == 10)
			self.searchRadius = 24000;
		else if (map.getZoom() == 11)
			self.searchRadius = 12000;
		else if (map.getZoom() == 12)
			self.searchRadius = 6000;
		else if (map.getZoom() == 13)
			self.searchRadius = 3000;
		else if (map.getZoom() == 14)
			self.searchRadius = 1500;
		else if (map.getZoom() == 15)
			self.searchRadius = 750;
		else if (map.getZoom() == 16)
			self.searchRadius = 375;
	}
	MapsLib.prototype.getgeoConditionInit = function (address, callback) {
		var self = this;
		if (address !== "") {
			if (address.toLowerCase().indexOf(self.locationScope) === -1) {
				//address = address + " " + self.locationScope;
			}
			

			self.geocoder.geocode({
				'address' : address
			}, function (results, status) {
				if (status === google.maps.GeocoderStatus.OK) {
					self.currentPinpoint = results[0].geometry.location;
					var map = self.map;

					$.address.parameter('address', encodeURIComponent(address));

					map.setCenter(self.currentPinpoint);

					if (self.addrMarkerImage != '') {
						if (self.addrMarker) {
							self.addrMarker.setMap(null);
						}
						self.addrMarker = new google.maps.Marker({
								position : self.currentPinpoint,
								map : self.map,
								icon : self.addrMarkerImage,
								//animation : google.maps.Animation.DROP,
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
	MapsLib.prototype.getgeoCondition = function (address, callback) {
		var self = this;
		if (address !== "") {
			if (address.toLowerCase().indexOf(self.locationScope) === -1) {
				//address = address + " " + self.locationScope;
			}

			self.geocoder.geocode({
				'address' : address
			}, function (results, status) {
				if (status === google.maps.GeocoderStatus.OK) {
					self.currentPinpoint = results[0].geometry.location;
					var map = self.map;

					$.address.parameter('address', encodeURIComponent(address));

					map.setCenter(map.getCenter());
					/*
					if (self.addrMarkerImage != '') {
					if (self.addrMarker) {
					self.addrMarker.setMap(null);
					}
					self.addrMarker = new google.maps.Marker({
					position : self.currentPinpoint,
					map : self.map,
					icon : self.addrMarkerImage,
					//animation : google.maps.Animation.DROP,
					title : address
					});
					}*/
					//var geoCondition = " AND ST_INTERSECTS(" + self.locationColumn + ", CIRCLE(LATLNG" + self.currentPinpoint.toString() + "," + self.searchRadius + "))";

					var geoCondition = " AND ST_INTERSECTS(" + self.locationColumn + ", CIRCLE(LATLNG" + self.map.getCenter().toString() + "," + self.searchRadius + "))";
					callback(geoCondition);
					self.drawSearchRadiusCircle(map.getCenter());
				} else {
					alert("We could not find your address: " + status);
					callback('');
				}
			});
		} else {
			callback('');
		}
	};
	var searchInProgress = false;
	MapsLib.prototype.doSearch = function () {
		var self = this;
		if (searchInProgress) {
			return;
		}

		var text_search = $("#text_search").val().replace("'", "\\'");

		if (text_search == '') {
			self.clearSearchResultsOnly();
			self.displayModSearchCount(0);
			return;
		}

		searchInProgress = true;
		self.clearSearchResultsOnly();

		var address = $("#search_address").val();
		var analytic_address_product = text_search + " from " + address;
		ga('send', 'event', 'search', 'product_from_address', analytic_address_product);

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
		searchInProgress = false;
	};

	MapsLib.prototype.reset = function () {
		$.address.parameter('address', '');
		$.address.parameter('radius', '');
		window.location.reload();
	};

	MapsLib.prototype.getInfo = function (callback) {
		var self = this;
		jQuery.ajax({
			url : 'https://www.googleapis.com/fusiontables/v2/tables/' + self.fusionTableId + '?key=' + self.googleApiKey,
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
				}
			} else {
				alert("Geocoder failed due to: " + status);
			}
		});
	};
	var debug = false;
	MapsLib.prototype.drawSearchRadiusCircle = function (point) {
		var self = this;
		if (!debug) {
			return;
		}
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
			base : "https://www.googleapis.com/fusiontables/v2/query?sql=",
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
			if (json.responseJSON === undefined) {
				return;
			}
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
			if (numRows != 0) {
				$("#result_count").html(self.addCommas(numRows) + " " + name + " found");
			} else {
				$("#result_count").html(self.addCommas(numRows) + " " + name + " found<br><small>Zoom out to search more products</small>");
			}
		});
		$("#result_box").fadeIn();
	};
	MapsLib.prototype.displayModSearchCount = function (numRows) {
		var self = this;
		var name = self.recordNamePlural;
		if (numRows == 1) {
			name = self.recordName;
		}
		d = document.getElementById('results_list');

		$("#result_box").fadeOut(function () {
			//$("#result_count").html(self.addCommas(numRows) + " " + name + " found");
			if (numRows != 0) {
				if (d.style.display == "none") {
					$("#result_count").html(self.addCommas(numRows) + " " + name + " found<br><small>(Click to see details)</small>");
				} else {
					$("#result_count").html(self.addCommas(numRows) + " " + name + " found<br><small>(Click to hide details)</small>");

				}
			} else {
				if ($("#text_search").val() != '') {
					$("#result_count").html(self.addCommas(numRows) + " " + name + " found<br><small>(Zoom out or pan to search more stores)</small>");
				} else {
					$("#result_count").html(self.addCommas(numRows) + " " + name + " found");
				}
			}
		});
		$("#result_box").fadeIn();
		document.getElementById('results_list').style.display = "none";
	};
	MapsLib.prototype.getList = function (whereClause) {
		var self = this;
		var selectColumns = "'Store', 'Product', 'Price', 'Location', 'Product Type', 'Quantity', 'Phone', 'Website', 'Store Type', 'Product Description'";

		self.query({
			select : selectColumns,
			where : whereClause
			//groupby : "GROUP BY 'Store'"
		}, function (response) {
			self.displayList(response);
		});
	},

	MapsLib.prototype.displayList = function (json) {
		var self = this;
		var data = json['rows'];
		var template = '';

		var results = $('#results_list');
		results.hide().empty(); //hide the existing list and empty it out first
		document.getElementById('results_list').style.display = "none";

		if (data == null) {
			//clear results list
			results.append("<li><span class='lead'>No results found</span></li>");
			if ($("#text_search").val() != '') {
				results.append("<br><small><li>Zoom out to include more products</li></small>")
			}

			self.displayModSearchCount(0);
			results.hide();
		} else {

			var myStoreArray = {};

			for (var row in data) {
				if (myStoreArray[data[row][3]]) {

					var myStoreProductArray = new Array;
					myStoreProductArray.push(myStoreArray[data[row][3]][1]);
					myStoreProductArray.push(data[row][1]);
					var minPrice = myStoreArray[data[row][3]][10];
					var maxPrice = myStoreArray[data[row][3]][11];
					if (!isNaN(data[row][2])) {
						minPrice = Math.min(minPrice, data[row][2]);
						maxPrice = Math.max(maxPrice, data[row][2]);
					}

					myStoreArray[data[row][3]] = [data[row][0], myStoreProductArray, data[row][2], data[row][3], '', data[row][4], data[row][6], data[row][7], data[row][8], data[row][9], minPrice, maxPrice];

				} else {
					var myStoreProductArray = new Array;
					if (data[row][5]) {
						myStoreProductArray.push(data[row][1] + "(" + data[row][5] + ")");
					} else {
						myStoreProductArray.push(data[row][1]);
					}
					var minPrice,
					maxPrice,
					Price;
					minPrice = 1000000.00;
					maxPrice = 0.00;
					Price = 0.00;
					if (!isNaN(data[row][2])) {
						//minPrice = data[row][2].toFixed(2);
						//maxPrice = data[row][2].toFixed(2);
						minPrice = data[row][2];
						maxPrice = data[row][2];
					}
					var newArray = [data[row][0], myStoreProductArray, minPrice, data[row][3], data[row][4], '', data[row][6], data[row][7], data[row][8], data[row][9], minPrice, maxPrice];

					myStoreArray[data[row][3]] = newArray;

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
																																																																																																																																												<strong><th>Store<br><small>(Click store link for details)</small></th><th>Product</th><th>Price</th><th>Dist/Time</th>";
					for (var row in myStoreArray) {

						Distance = distances[Count];
						Duration = durations[Count];

						Price = "$" + myStoreArray[row][2];
						if (myStoreArray[row][10] != myStoreArray[row][11]) {
							var minString = "";
							var maxString = "";
							if (myStoreArray[row][10] != 0.00) {
								minString = "$" + myStoreArray[row][10]
							}
							if (myStoreArray[row][11] != 0.00) {
								maxString = "$" + myStoreArray[row][11]
							}

							Price = minString + ".." + maxString;
						}

						if (((myStoreArray[row][10] == 0.00) && (myStoreArray[row][11] == 0.00)) || (myStoreArray[row][10] == 1000000.00)) {

							Price = "In Store";
						}
						Product = myStoreArray[row][1];
						if (myStoreArray[row][1].length != 1) {
							Product = "Multiple matches of " + $("#text_search").val() + " found";
							myStoreArray[row][9] = '';
						}

						var productStr = String(myStoreArray[row][1]);
						if (productStr.length > 100) {
							productStr = productStr.substring(0, 99) + "...";
							myStoreArray[row][9] = '';
						}

						template = template.concat("<tr><td>" + myStoreArray[row][8] + "<br><strong><a href='javascript:centerOn(\"" + myStoreArray[row][3] + "\",\"" + myStoreArray[row][0] + "\",\"" + productStr + "\",\"" + Price + "\",\"" + myStoreArray[row][6] + "\",\"" + myStoreArray[row][7] + "\",\"" + myStoreArray[row][8] + "\",\"" + myStoreArray[row][9] + "\")'>" + myStoreArray[row][0] + "</a></strong></td>\
																																																																																																																																																															<td>" + Product + "</td><td>" + Price + "</td>\
																																																																																																																																																															<td>" + Distance + "/" + Duration + "</td>\
																																																																																																																																																															</tr>");
						Count = Count + 1;

					}
					template = template.concat("</table></small>");

					results.append(template);

					self.displayModSearchCount(Count);

				}

			});

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
				//navigator.geolocation.watchPosition(function (position) {
				var latitude = position.coords.latitude;
				var longitude = position.coords.longitude;
				var accuracy = position.coords.accuracy;
				var coords = new google.maps.LatLng(latitude, longitude);
				self.map.panTo(coords);
				self.addrFromLatLng(coords);

				prevZoom = this.defaultZoom;
				jQuery('#map_canvas').append('<div id="myposition"><i class="fontello-target"></i></div>');
				setTimeout(function () {
					jQuery('#myposition').remove();
				}, 3000);
				setTimeout(function () {
					self.getgeoConditionInit($('#search_address').val(), function (geoCondition) {});
					ga('send', 'event', 'link', 'address', $('#search_address').val());
					self.doSearch();
				}, 1000);

			}, function error(msg) {
				alert('Please enable your GPS position.');
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
