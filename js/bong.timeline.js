/*! Copyright (c) 2016 Saptarshi Bhattacharya

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Timeline = (function(){
	//Private
	var factor_ms2day = 24 * 60 * 60 * 1000,
		$,
		$error = {
			missingIdentifier: "Missing identifier",
			invalidDataModel: "The model does not have necessary attributes"
		},
		$warning = {
			noData: "No data was provided",
			endStartDateMissMatch: "End date cannot be greater than start date. Data ignored.",
			endStartDateExchanged: "End date cannot be greater than start date. Dates exchanged.",
			missingMandatoryData: "Missing mandatory data. Date ignored. "
									+"Following properties are mandatory: startDate, endDate & title",
			incorrectDateFormat: "Invalid date format. Data ignored."
		},
		$default = {
			orientation: "horizontal",
			range: 20,
			slotSize: 90,
			slotSpace_horizontal: 45,
			slotSpace_vertical: 125,
			slotExtend_vertical: 75,
			slotExtend_horizontal: 60,
			isSortedData: false,
			clutter: false,
			clutter_extras: 7,
			template: function(data){
				return "<span class='block'>" + data.title + "</span>";
			},
			scrollToOffset: 2,
			renderEmptyTimeline: true
		},
		$keywords = {
			vertical: "vertical",
			today: "today",
			latest: "latest",
			next: "next",
			closest: "closest"
		},
		$domAttributesList = {
			horizontal : {
				size: "width",
				space: "top",
				offset: "left",
				scrollDirection: "scrollLeft",
				scrollOffset: "offsetWidth"
			},
			vertical : {
				size: "height",
				space: "left",
				offset: "top",
				scrollDirection: "scrollTop",
				scrollOffset: "offsetHeight"
			}
		},
		$classList = {
			horizontal : {
				timeline: "timeline",
				scroller: "scroller",
				content: "content",
				units: "units",
				unit: "unit",
				date: "date",
				event: "event",
				line: "line",
				day: "day",
				month: "month" ,
				year: "year",
				mark: "mark"
			},
			vertical : {
				timeline: "timeline vertical",
				scroller: "scroller",
				content: "content",
				units: "units",
				unit: "unit",
				date: "date",
				event: "event",
				line: "line",
				day: "day",
				month: "month" ,
				year: "year",
				mark: "mark"
			}
		},
		$tagList = {
			horizontal: { dateSeperator: "<br/>" },
			vertical : { dateSeperator: "<br/>"}
		},
		$domAttribute = $domAttributesList.horizontal,
		$class = $classList.horizontal,
		$tag = $tagList.horizontal,
		$wrapper,
		$timeline,
		$scroller,
		$content,
		$units,
		$events = [],
		$scrollTo,
		$slots = [],
		$months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		$latestEventDate,
		$eventsFragment = document.createDocumentFragment(),
		$maxSlotIndex;

	var Timeline = function(params) {
		if(typeof params.wrapperId != "string") throw $error.missingIdentifier;
		if(!(params.data instanceof Array)) console.warn($warning.noData);

		$ = this;
		this.wrapperId = params.wrapperId;
		this.range = typeof params.range !== "number" ? $default.range : params.range;
		this.defaultDate = params.defaultDate instanceof Date && params.defaultDate != "Invalid Date" 
							? params.defaultDate: new Date();
		this.startDate = new Date(this.defaultDate.valueOf() - this.range * factor_ms2day);
		this.endDate = new Date(this.defaultDate.valueOf() + this.range * factor_ms2day);

		this.data = !(params.data instanceof Array) ? [] : params.data;
		this.isSortedData = typeof params.isSortedData == "boolean" ? params.isSortedData : $default.isSortedData;
		this.dataModel = params.dataModel;
		this.orientation = typeof params.orientation !== "string" ? $default.orientation : params.orientation;
		this.slotSize = typeof params.slotSize !== "number" ? $default.slotSize : params.slotSize;
		this.slotSpace = typeof params.slotSpace !== "number" ? 
						(this.orientation == $keywords.vertical ? $default.slotSpace_vertical : $default.slotSpace_horizontal) : 
						params.slotSpace;
		this.slotExtend = this.orientation == $keywords.vertical ? $default.slotExtend_vertical : $default.slotExtend_horizontal;
		this.template = typeof params.template === "function" ? params.template : $default.template;
		this.onRender = params.onRender;
		this.clutter = typeof params.clutter === "boolean" ? params.clutter : $default.clutter;
		this.clutterExtras = typeof params.clutterExtras === "number"? params.clutterExtras : $default.clutter_extras;
		this.renderEmptyTimeline = typeof params.renderEmptyTimeline === "boolean" ? params.renderEmptyTimeline : $default.renderEmptyTimeline;
		this.onEmptyTimeline = typeof params.onEmptyTimeline === "function" ? params.onEmptyTimeline: undefined;

		this.render();
		if($events.length == 0 && this.onEmptyTimeline){
			this.onEmptyTimeline();
		}
	}

	Timeline.prototype = {
		setAttributes: function(params){
			this.defaultDate = params.defaultDate instanceof Date ? params.defaultDate: this.defaultDate ? this.defaultDate : new Date();
			this.data = !(params.data instanceof Array) ? (this.data ? this.data : []) : params.data;
			
			this.startDate = new Date(this.defaultDate.valueOf() - this.range * factor_ms2day);
			this.endDate = new Date(this.defaultDate.valueOf() + this.range * factor_ms2day);

			return this;
		},
		render: function(){
			//Clear the area
			document.getElementById(this.wrapperId).innerHTML = "";

			//Clear variables
			$slots = [];
			$events = [];

			this.strip_time();
			if(this.orientation == $keywords.vertical) setVerticalOrientation();
			if(this.dataModel) this.create_data();
			if(!this.isSortedData) this.sort_data();
			this.dom_create_events();

			if($events.length == 0 && !this.renderEmptyTimeline) return;
			this.dom_render();
			if($events.length > 0) this.dom_draw_events();
			if(!(this.clutter && $events.length > 0)) this.dom_assign_ui_events();

			setTimeout(function(){
				$scroller[$domAttribute.scrollDirection] = $scroller[$domAttribute.scrollDirection] + $scrollTo;
				if($.onRender) $.onRender();
			},0);
		},
		create_data: function(){
			if(!this.dataModel.startDate || !this.dataModel.endDate || !this.dataModel.title) throw $error.invalidDataModel;
			var data = this.data.splice(0),
				r_data = [],
				e;

			for(var i = 0, len = data.length; i < len; i++){
				e = {
					startDate : data[i][this.dataModel.startDate],
					endDate : data[i][this.dataModel.endDate],
					title : data[i][this.dataModel.title]
				}
				
				r_data.push(e);
			}

			this.data = r_data;
		},
		strip_time: function(){
			for(var i = 0, len = this.data.length; i < len; i++){
				this.data[i].startDate.setHours(0);
				this.data[i].startDate.setMinutes(0);
				this.data[i].startDate.setSeconds(0);
				this.data[i].startDate.setMilliseconds(0);
			}
		},
		sort_data: function(){
			this.data.sort(function(a, b) { return new Date(a.startDate).valueOf() - new Date(b.startDate).valueOf()} )
		},
		dom_render: function(){
			var fragment = document.createDocumentFragment();
				//len = parseInt((this.endDate - this.startDate)/factor_ms2day);

			$wrapper = document.getElementById(this.wrapperId);
			$timeline = document.createElement("div");
			$scroller = document.createElement("div");
			$content = document.createElement("div");
			$units = document.createElement("ul");

			$timeline.setAttribute("class", $class.timeline);
			$scroller.setAttribute("class", $class.scroller);
			$content.setAttribute("class", $class.content);
			$units.setAttribute("class", $class.units);

			$units.appendChild(this.clutter && $events.length > 0 ? this.dom_get_units_fragment_clutter() : 
				this.dom_get_units_fragment(this.startDate, this.endDate));
			
			//$scrollTo = ((new Date() - this.startDate)/factor_ms2day - 5) * this.slotSize;

			$scroller.appendChild($content);
			$scroller.appendChild($units);
			$timeline.appendChild($scroller);
			fragment.appendChild($timeline);

			$wrapper.appendChild(fragment);
		},
		dom_create_events: function(){
			var title, 
				event,
				size,
				offset,
				space,
				slotIndex,
				maxSlotIndex = 0,
				data = this.data,
				_event,
				heighestEndDateEvent;

			for(var i = 0, len = data.length; i < len; i++){
				if(typeof data[i].startDate === "undefined" ||
					typeof data[i].endDate === "undefined" ||
					typeof data[i].title === "undefined") {
						console.warn($warning.missingMandatoryData);
						continue;
				}
				if(!data[i].startDate instanceof Date 
					|| !data[i].startDate instanceof Date
					|| data[i].startDate == "Invalid Date"
					|| data[i].endDate == "Invalid Date") {
						console.warn($warning.incorrectDateFormat);
						continue;
				}

				if(data[i].endDate < data[i].startDate) {
					console.warn($warning.endStartDateMissMatch);
					continue;
				}

				event = document.createElement("div");
				event.setAttribute("class", $class.event);

				size = (parseInt((data[i].endDate - data[i].startDate)/factor_ms2day)) * this.slotSize + this.slotExtend;
				
				if(this.clutter){
					if(!offset) offset = this.clutterExtras * this.slotSize;
					else{
						if(data[i].startDate.valueOf() - heighestEndDateEvent.data.endDate.valueOf() > factor_ms2day){
							offset = heighestEndDateEvent.offset + heighestEndDateEvent.size 
									+ this.slotSize - this.slotExtend;
						} else {
							offset = $events[i - 1].offset 
									+ parseInt((data[i].startDate - data[i - 1].startDate)/factor_ms2day)
									* this.slotSize;
						}
					}
				} else{
					offset = (parseInt((data[i].startDate - this.startDate)/factor_ms2day)) * this.slotSize;
				}
				
				slotIndex = getSlotIndex(offset/this.slotSize, (size == 0 ? 1 : size)/this.slotSize);
				maxSlotIndex = slotIndex > maxSlotIndex ? slotIndex : maxSlotIndex;

				space = slotIndex * this.slotSpace;

				_event = {
					size: size,
					offset: offset,
					space: space,
					slotIndex: slotIndex,
					data: data[i]
				}

				$events.push(_event);

				if(this.clutter){
					heighestEndDateEvent = heighestEndDateEvent  
										? (_event.data.endDate > heighestEndDateEvent.data.endDate 
											? _event : heighestEndDateEvent) 
										: _event;
				}
			}

			$maxSlotIndex = maxSlotIndex;
		},
		dom_draw_events: function(){
			var event,
				_startDate = this.startDate,
				diff = Infinity;

			for(var i = 0, len = $events.length; i < len; i++){
				event = document.createElement("div");
				event.setAttribute("class", $class.event);

				event.setAttribute("style", $domAttribute.size + ":" + $events[i].size + "px;" +
											$domAttribute.offset + ":" + $events[i].offset + "px;" + 
											$domAttribute.space + ":" + $events[i].space + "px;" );

				event.innerHTML = this.template($events[i].data);

				$eventsFragment.appendChild(event);

				$events[i].dom = event;

				//debugger;
				if(this.clutter && Math.abs(this.defaultDate - $events[i].data.startDate) < diff){
					$scrollTo = $events[i].offset;
					diff = this.defaultDate - $events[i].data.startDate;
				}
			}

			$content.setAttribute("style", $domAttribute.size + ":"+ ($units.childNodes.length * this.slotSize) + "px");
			
			setTimeout(function(){
				$content.innerHTML = "";
				$content.appendChild($eventsFragment);
			}, 0);

			$scrollTo = !this.clutter 
						? ((this.defaultDate - _startDate)/factor_ms2day - $default.scrollToOffset) * this.slotSize
						: $scrollTo - this.slotSize * 2;
		},
		dom_assign_ui_events: function(){
			var self = this;
			$scroller.onscroll = function(){
				if(this[$domAttribute.scrollDirection] == 0) self.dom_update_events_past();
				if(this[$domAttribute.scrollDirection] + $scroller[$domAttribute.scrollOffset] >= $units.childElementCount * self.slotSize) self.dom_update_events_future();
			};
		},
		dom_update_events_past: function(){
			var newStartDate = new Date(this.startDate.valueOf() - this.range * factor_ms2day),
				fragment = this.dom_get_units_fragment(newStartDate, this.startDate),
				fragmentSize = (this.startDate - newStartDate)/factor_ms2day * this.slotSize;

			$units.insertBefore(fragment, $units.childNodes[0]);

			for (var i = 0; i < $events.length; i++) {
				$events[i].offset += fragmentSize;
				$events[i].dom.style[$domAttribute.offset] = $events[i].offset + "px";
			}

			this.startDate = newStartDate;
			$content.setAttribute("style", $domAttribute.size + ":" + ($units.childNodes.length * this.slotSize) + "px");

			setTimeout(function(){
				$scroller[$domAttribute.scrollDirection] = fragmentSize;
			}, 0);

			//this.dom_remove_elements("bottom");
		},
		dom_update_events_future: function(){
			var newEndDate = new Date(this.endDate.valueOf() + this.range * factor_ms2day),
				fragment = this.dom_get_units_fragment(this.endDate, newEndDate),
				fragmentSize = (newEndDate - this.endDate)/factor_ms2day * this.slotSize;

			$units.appendChild(fragment);

			this.endDate = newEndDate;
			$content.setAttribute("style", $domAttribute.size + ":"+ ($units.childNodes.length * this.slotSize) + "px");

			// Remove elements from top
			//this.dom_remove_elements("top");
		},
		dom_remove_elements: function(from){
			var unitList = document.getElementsByClassName($class.unit);
			if(from=="top"){
				for(var i = 0, len = unitList.length; i < len; i++){
					unitList[i].remove();
				}
			} else{
				for(var i = unitList.length - 1, len = -1; i > len; i--){
					unitList[i].remove();
				}
			}

		},
		dom_get_units_fragment: function(startDate, endDate){
			var fragment = document.createDocumentFragment(),
				len = parseInt((endDate - startDate)/factor_ms2day),
				unit,
				date;

			for(var i = 0; i < len; i++){
				date = new Date(startDate.valueOf() + i * factor_ms2day);

				unit = this.dom_get_unit(date);
				
				fragment.appendChild(unit);
			}

			return fragment;
		},
		dom_get_units_fragment_clutter: function(){
			console.log(this.data);
			var fragment = document.createDocumentFragment(),
				len,
				startDate,
				endDate,
				unit,
				date,
				mark = false,
				breakPoint = true;

			// Extra units at the top
			for(var i = this.clutterExtras; i > 0; i--){
				fragment.appendChild(this.dom_get_unit(new Date($events[0].data.startDate.valueOf() - i * factor_ms2day)));
			}

			for(var j = 0, l = $events.length; j < l; j++){
				startDate = breakPoint ? $events[j].data.startDate : startDate;
				endDate = j > 0 
						? ($events[j].data.endDate > endDate
							? $events[j].data.endDate
							: endDate)  
						:$events[j].data.endDate;
				breakPoint = $events.length == (j + 1) || $events[j + 1].data.startDate.valueOf() - endDate.valueOf() > factor_ms2day
							? true
							: false;
				len = parseInt((endDate - startDate)/factor_ms2day);

				if(breakPoint){
					for(var i = 0; i <= len; i++){
						date = new Date(startDate.valueOf() + i * factor_ms2day);

						mark = i == 0 || i == len ? true: false;
						unit = this.dom_get_unit(date, mark, mark, mark);
						
						fragment.appendChild(unit);
					}
				}
			}

			// Extra units at the bottom
			for(var i = 1; i <= this.clutterExtras; i++){
				fragment.appendChild(this.dom_get_unit(new Date(endDate.valueOf() + i * factor_ms2day), mark, mark, mark));
				mark = mark ? false: mark;
			}
			return fragment;
		},
		dom_get_unit: function(date, getMonth, getYear, markSeperator){
			var unit,
				day,
				line,
				unit_month,
				unit_day,
				unit_year,
				prev_date = new Date(date.valueOf() - factor_ms2day),
				next_date = new Date(date.valueOf() + factor_ms2day),
				//month = $months[date.getMonth()],
				//year = 1900 + date.getYear(),
				month = date.getMonth() != prev_date.getMonth() || date.getMonth() != next_date.getMonth() 
										|| getMonth?
						$months[date.getMonth()] : "",
				year = date.getYear() != prev_date.getYear() || date.getYear() != next_date.getYear() 
										|| getYear || month?
						1900 + date.getYear() : "";

			unit = document.createElement("li");
			unit.setAttribute("class", $class.unit);

			day = document.createElement("span");
			day.setAttribute("class", $class.date);

			unit_month = document.createElement("div");
			unit_month.setAttribute("class", $class.month);
			unit_month.innerHTML = month;

			unit_day = document.createElement("div");
			unit_day.setAttribute("class", $class.day);
			unit_day.innerHTML = date.getDate();

			unit_year = document.createElement("div");
			unit_year.setAttribute("class", $class.year);
			unit_year.innerHTML = year;

			day.appendChild(unit_month);
			day.appendChild(unit_day);
			day.appendChild(unit_year);
			//day.innerHTML = date.getDate() + $tag.dateSeperator + month + $tag.dateSeperator + year;

			line = document.createElement("div");
			line.setAttribute("class", $class.line + " " + (markSeperator ? $class.mark : ""));

			unit.appendChild(day);
			unit.appendChild(line);

			return unit;
		},

		// Getters
		getMaxSlotIndex: function() { return $maxSlotIndex; },
		getDOMContent: function() { return $content },
		getDOMScroller: function() { return $scroller },
		getDOMUnits: function() { return $units }
	}

	//Private
	var setVerticalOrientation = function(){
		$domAttribute = $domAttributesList.vertical;
		$class = $classList.vertical;
		$tag = $tagList.vertical;
	}

	var getSlotIndex = function(offset, size){
		var index, flag;
		if($events.length != 0){
			for(var j = 0, lj = $slots.length; j < lj; j++){
				flag = true;
				for(var k = offset, lk = offset + size; k < lk; k++){
					if($slots[j][k] == true) { flag = false; break; }
				}
				if(flag) break;
			}
			if(j == $slots.length){
				$slots[j] = [];	
			}
			index = j
		} else {
			index = 0;
		}

		$slots[index] = [];

		for(var j = offset; j < offset+size; j++){
			$slots[index][j] = true;
		}	

		$slots[index][offset] = true;
		$slots[index][offset + size - 2] = true;

		return index;
	}
	
	return Timeline;
})();