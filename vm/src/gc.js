/*
 * Moonshine - a Lua virtual machine.
 *
 * Email: moonshine@gamesys.co.uk
 * http://moonshinejs.org
 *
 * Copyright (c) 2013-2015 Gamesys Limited. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @fileOverview Garbage collection namespace.
 * Collects and reuses vanilla objects and arrays to avoid the overhead of object creation.
 * @author <a href="mailto:paul.cuthbertson@gamesys.co.uk">Paul Cuthbertson</a>
 */


'use strict';


var shine = shine || {};


(function (shine) {


	/**
	 * Constant empty object for use in comparisons, etc to avoid creating an object needlessly
	 * @type Object
	 * @constant
	 */
	shine.EMPTY_OBJ = {};


	/**
	 * Constant empty array for use in comparisons, etc to avoid creating an object needlessly
	 * @type Object
	 * @constant
	 */
	shine.EMPTY_ARR = [];




	/**
	 * Moonshine GC functions.
	 * @namespace
	 */
	shine.gc = { 


		/**
		 * Collected objects, empty and ready for reuse.
		 * @type Array
		 * @static
		 */
		objects: [],


		/**
		 * Collected objects, empty and ready for reuse.
		 * @type Array
		 * @static
		 */
		arrays: [],

    /**
     * Buffering of increment operations for deferred reference counting.
     * @type Array
     * @static
     */
    increments: [],

    /**
     * Buffering of decrement operations for deferred reference counting.
     * @type Array
     * @static
     */
    decrements: [],


		/**
		 * Number of objects and array that have been collected. Use for debugging.
		 * @type Number
		 * @static
		 */
		collected: 0,


		/**
		 * Number of objects and array that have been reused. Use for debugging.
		 * @type Number
		 * @static
		 */
		reused: 0,




		/**
		 * Prepare an array for reuse.
		 * @param {Array} arr Array to be used.
		 */
		cacheArray: function (arr) {
			arr.length = 0;
			this.arrays.push(arr);
			// this.collected++;
		},




		/**
		 * Prepare an object for reuse.
		 * @param {Object} obj Object to be used.
		 */
		cacheObject: function (obj) {
			for (var i in obj) if (obj.hasOwnProperty(i)) delete obj[i];
			this.objects.push(obj);
			// this.collected++;
		},




		/**
		 * Returns a clean array from the cache or creates a new one if cache is empty.
		 * @returns {Array} An empty array.
		 */
		createArray: function () {
			if (this.arrays.length) this.reused++;
			return this.arrays.pop() || [];
		},




		/**
		 * Returns a clean object from the cache or creates a new one if cache is empty.
		 * @returns {Object} An empty object.
		 */
		createObject: function () { 
			if (this.objects.length) this.reused++;
			return this.objects.pop() || {};
		},




    /**
     * Calculates deferred reference count updates.
     */
    syncReferences: function () {
      var  length = this.increments.length > this.decrements.length
        ? this.increments.length
        : this.decrements.length;

      console.log('syncing');
      // Bail out early if we have nothing to do.
      if (!length) return;

      var freetable = [];

      // Perform all reference updates in one pass.
      for (var i = 0; i < length; i++) {
        // Perform increments.
        var ival = this.increments[i];
        if (ival && ival.__shine) ival.__shine.refCount++;

        // Perform decrements.
        var dval = this.decrements[i];
        if (dval && dval.__shine &&  --dval.__shine.refCount === 0) freetable.push(dval);
      };

      // Perform any necessary collections.
      for (i = 0, length = freetable.length; i < length; i++) {
        var fval = freetable[i];
        if (fval.__shine && !fval.__shine.refCount) this.collect(fval);
      };

      console.log('Freed ' + freetable.length + ' objects.');

      // Our reference counts are in sync, reset our buffers.
      this.increments.length = this.decrements.length = 0;
    },




		/**
		 * Reduces the number of references associated with an object by one and collect it if necessary.
		 * @param {Object} Any object.
		 */
		decrRef: function (val) {
			if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
      this.decrements.push(val);
		},




		/**
		 * Increases the number of references associated with an object by one.
		 * @param {Object} Any object.
		 */
		incrRef: function (val) {
			if (!val || !(val instanceof shine.Table) || val.__shine.refCount === undefined) return;
      this.increments.push(val);
		},




		/**
		 * Collect an object.
		 * @param {Object} Any object.
		 */
		collect: function (val) {
			if (val === undefined || val === null) return;
			if (val instanceof Array) return this.cacheArray(val);
			if (typeof val == 'object' && val.constructor == Object) return this.cacheObject(val);

			if (!(val instanceof shine.Table) || val.__shine.refCount === undefined) return;

			var i, l, 
				meta = val.__shine;

			for (i = 0, l = meta.keys.length; i < l; i++) this.decrRef(meta.keys[i]);
			for (i = 0, l = meta.values.length; i < l; i++) this.decrRef(meta.values[i]);
			for (i = 0, l = meta.numValues.length; i < l; i++) this.decrRef(meta.numValues[i]);

			this.cacheArray(meta.keys);
			this.cacheArray(meta.values);

			delete meta.keys;
			delete meta.values;

			this.cacheObject(meta);
			delete val.__shine;

			for (i in val) if (val.hasOwnProperty(i)) this.decrRef(val[i]);
		}


	};

  // Start the reference counter.
  setInterval(shine.gc.syncReferences.bind(shine.gc), 14);



})(shine || {});
