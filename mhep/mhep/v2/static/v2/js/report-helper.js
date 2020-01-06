function targetbarCarboncoop(element, options) {
    var width = $('#' + element).width();
    var height = $('#' + element).height();

    // $("#"+element).html("<div style='padding-bottom:5px; font-size:16px; color:rgba(99,86,71,0.8);'>"+options.name+": <b style='float:right'>"+options.value+" "+options.units+"</b></div>");
    $('#' + element).html("<div style='padding-bottom:5px; font-size:18px; color:rgba(99,86,71,0.8);'>" + options.name + '</div>');
    var titleheight = $('#' + element + ' div').height();
    var barheight = height - titleheight - 5;
    var barheight = 25 * options.values.length;
    $('#' + element).append('<canvas id="' + element + '-canvas" width="' + width + '" height="' + barheight + '" style="max-width:100%"></canvas>');

    var c = document.getElementById(element + '-canvas');
    var ctx = c.getContext('2d');


    var maxval = options.value;
    for (z in options.targets) {
        if (options.targets[z] > maxval) {
            maxval = options.targets[z];
        }
    }
    maxval *= 1.2; // Always 20% larger than max target or value

    var xscale = width / maxval;
    var colors = options.colors;

    ctx.fillStyle = 'white';
    ctx.fillRect(1, 1, width - 2, barheight - 2);


    if (typeof options['values'] != 'undefined') {
        var subBarHeightFraction = 1 / options['values'].length;
        for (var i = 0; i < options['values'].length; i++) {
            ctx.fillStyle = colors[i];
            var y = 1 + subBarHeightFraction * barheight * i;
            ctx.fillRect(1, y, (options.values[i] * xscale) - 2, subBarHeightFraction * barheight);
            ctx.font = '13px Arial';
            ctx.fillStyle = 'rgba(99,86,71,1.0)';
            ctx.fillText(options.values[i] + ' ' + options.units, 4, y + 16);
        }
    } else {
        ctx.fillStyle = 'rgb(217, 58, 71)';
        ctx.fillRect(1, 1, (options.value * xscale) - 2, barheight - 2);
    }
    ctx.font = '14px Arial';
    ctx.setLineDash([4, 4]);

    var i = 60;
    var index = 0;
    for (z in options.targets) {
        //  if (index == 2)
        //    i = 30;
        xpos = options.targets[z] * xscale;

        ctx.strokeStyle = 'rgba(99,86,71,0.8)';
        ctx.beginPath();
        ctx.moveTo(xpos, 1);
        ctx.lineTo(xpos, barheight - 1);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(99,86,71,1.0)';
        ctx.fillText(z + ':', xpos + 5, barheight - 70);
        ctx.fillText(options.targets[z] + ' ' + options.units, xpos + 15, barheight - 54);
        i = i - 60;
        index++;
    }

    // draw target range
    if (typeof options.targetRange != 'undefined') {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(options.targetRange[0] * xscale, 1, xscale * (options.targetRange[1] - options.targetRange[0]), barheight);
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(99,86,71,0.8)';
    ctx.strokeRect(1, 1, width - 2, barheight - 2);
    ctx.font = '5px Ubuntu';

}


/**
 * Bar Chart Library
 */

function BarChart(options) {

    var self = this;
    options = options || {};

    self._data = options.data || null;
    self._defaultBarColor = options.defaultBarColor || 'rgb(245,30,30)';
    self._barColors = options.barColors || {};
    self._barWidth = options.barWidth || null;
    self._barGutter = options.barGutter || 0;
    self._barDivisionType = options.barDivisionType || 'stack';
    self._element = (options.elementId) ? this.element(options.elementId) : null;
    self._canvas = null;
    self._width = options.width || 600;
    self._chartHeight = options.chartHeight || 400;
    self._ranges = options.ranges || [];
    self._defaultRangeColor = options._defaultRangeColor || 'rgb(254,204,204)';
    self._targets = options.targets || [];
    self._defaultTargetColor = options._defaultTargetColor || 'rgb(236,102,79)';
    self._defaultVarianceColor = options.defaultVarianceColor || 'rgb(0,0,0)';
    self._font = options.font || 'Arial';
    self._fontSize = options.fontSize || 14;
    self._barLabelsColor = options.barLabelsColor || 'rgb(189,188,187)';
    self._chartLow = (typeof options.chartLow !== 'undefined') ? options.chartLow : null;
    self._chartHigh = options.chartHigh || null;
    self._division = options.division || 100;
    self._divisionColor = options.divisionColor || 'rgb(180,180,180)';
    self._divisionLabelsColor = options.divisionLabelsColor || 'rgb(104,103,103)';
    self._yAxisLabel = options.yAxisLabel || 50;
    self._yAxisLabelBackgroundColor = options.yAxisLabelBackgroundColor || 'rgb(236,236,236)';
    self._yAxisLabelColor = options.yAxisLabelColor || 'rgb(191,190,190)';
    self._yAxisTextAlign = options.yAxisTextAlign || 'center';
    self._chartTitle = options.chartTitle || null;
    self._chartTitleTextAlign = options.chartTitleTextAlign || 'left';
    self._chartTitleColor = options.chartTitleColor || 'rgb(195,194,194)';
    self._backgroundColor = options.backgroundColor || 'rgb(255,255,255)';

    /**
     * Sets canvas to `cvs` if provided, or resturns the canvas element
     */
    self.canvas = function(cvs) {
        if (!cvs && !self._canvas) {
            cvs = document.createElement('canvas');
            cvs.width = self._width;
            cvs.height = self._height;
            cvs.style.maxWidth = '100%';
            var ctx = cvs.getContext('2d');
            ctx.fillStyle = self._backgroundColor;
            ctx.fillRect(0, 0, self._width, self._height);
        }

        if (cvs) {
            self._canvas = cvs;
        }

        return self._canvas;
    };


    self.context = function() {
        return self.canvas().getContext('2d');
    };


    self.element = function(elementId) {
        if (elementId) {
            self._element = document.getElementById(elementId);
        }

        return self._element;
    };


    self.draw = function(elementId) {
        if (elementId) {
            self.element(elementId);
        }

        // draw chart elements

        if (self._chartTitle) {
            self.drawChartTitle();
        }

        if (self._ranges && self._ranges.length) {
            for (var i = 0, len = self._ranges.length; i < len; i ++) {
                self.drawRange(self._ranges[i].low, self._ranges[i].high, self._ranges[i].label, self._ranges[i].color);
            }
        }

        self.drawScale();
        self.drawYAxisLabel();
        self.drawBars();
        self.drawBarLabels();

        // Targets should be above bars, so draw them after drawing the bars.

        if (self._targets && self._targets.length) {
            for (var i = 0, len = self._targets.length; i < len; i ++) {
                self.drawTarget(self._targets[i].target, self._targets[i].label, self._targets[i].color);
            }
        }

        if (self.objectLength(self._barColors)) {
            self.drawKey(self._barColors);
        }

        // append canvas to element
        self.element().appendChild(self.canvas());
    };


    self.drawChartTitle = function() {
        if (!self._chartTitle) {
            return false;
        }

        var ctx = self.context();
        ctx.fillStyle = self._chartTitleColor;
        ctx.font = self.font();
        ctx.textAlign = self._chartTitleTextAlign;

        if (self._chartTitleTextAlign === 'left') {
            ctx.fillText(self._chartTitle, 0, self._fontSize * 2);
        } else if (self._chartTitleTextAlign === 'center') {
            ctx.fillText(self._chartTitle, self._width / 2, self._fontSize * 2);
        } else if (self._chartTitleTextAlign === 'right') {
            ctx.fillText(self._chartTitle, self._width, self._fontSize * 2);
        }
    };


    self.drawYAxisLabel = function() {
        var ctx = self.context();
        ctx.font = self.font();
        ctx.save();
        ctx.translate(self.getYAxisLabelWidth() / 2, (self.getChartHeight() / 2) + self.getChartTitleHeight());
        ctx.rotate(-Math.PI/2);
        ctx.fillStyle = self._yAxisLabelBackgroundColor;
        ctx.fillRect((self.getChartHeight() / 2) * -1, (self.getYAxisLabelWidth() / 2) * -1, self.getChartHeight(), self._fontSize * 3);
        ctx.textAlign = self._yAxisTextAlign;
        ctx.fillStyle = self._yAxisLabelColor;
        ctx.fillText(self._yAxisLabel, 0, 0);
        ctx.restore();
    };


    self.drawScale = function() {

        if (self._division === 'auto') {
            var x = Math.floor(self.chartHigh() / 10);
            var every = Math.round(x / 15) * 10;
        } else {
            var every = self._division;
        }

        var low = Math.ceil(self.chartLow() / every) * every;
        var high = self.chartHigh();

        var ctx = self.context();
        ctx.strokeStyle = self._divisionColor;
        ctx.lineWidth = 1;
        ctx.font = self.font();
        ctx.textAlign = 'right';
        ctx.fillStyle = self._divisionLabelsColor;

        for (var i = low; i <= high; i += every) {
            const x = self.horizontalPixelPosition(0);
            const y = self.verticalPixelPosition(i);

            ctx.beginPath();
            ctx.moveTo(x, y - 0.5);
            ctx.lineTo(self.getChartRightPos(), y - 0.5);
            ctx.stroke();
            ctx.closePath();
            ctx.fillText(i, x - (self._fontSize / 2), y + (self._fontSize / 4));
        }
    };


    self.drawBars = function() {
        var ctx = self.context();
        var data = self._data;
        var barGutter = self._barGutter;
        var barWidth = self._barWidth;
        var barColor;

        for (var i = 0, len = data.length; i < len; i ++) {
            if (isNaN(data[i].value)) {
                if (self._barDivisionType === 'group') {
                    var rawHorizontalPosition = i * (barWidth + barGutter) + barGutter;

                    for (var i2 = 0, len2 = data[i].value.length; i2 < len2; i2 ++) {
                        barColor = self._defaultBarColor;

                        if (self.getLabelColor(data[i].value[i2].label)) {
                            barColor = self.getLabelColor(data[i].value[i2].label);
                        } else if (self.getLabelColor(data[i].label)) {
                            barColor = self.getLabelColor(data[i].label);
                        }

                        ctx.fillStyle = barColor;
                        ctx.fillRect(
                            self.horizontalPixelPosition(rawHorizontalPosition),
                            self.verticalPixelPosition(0),
                            barWidth / data[i].value.length,
                            self.valueToPixels(data[i].value[i2].value) * -1
                        );

                        if (data[i].value[i2].variance !== undefined) {
                            self.drawErrorBars(rawHorizontalPosition,data[i].value[i2].value,data[i].value[i2].variance,data[i].value.length);
                        }

                        rawHorizontalPosition += barWidth / data[i].value.length;
                    }
                } else {
                    var verticalPos = self.verticalPixelPosition(self.barLow(data[i]));
                    var orderedData = [];


                    for (var i2 = 0, len2 = data[i].value.length; i2 < len2; i2 ++) {
                        if (data[i].value[i2].value < 0) {
                            orderedData.push({
                                value: data[i].value[i2].value * -1,
                                label: data[i].value[i2].label
                            });
                        }
                    }

                    for (var i2 = 0, len2 = data[i].value.length; i2 < len2; i2 ++) {
                        if (data[i].value[i2].value > 0) {
                            orderedData.push(data[i].value[i2]);
                        }
                    }

                    for (var i2 = 0, len2 = orderedData.length; i2 < len2; i2 ++) {
                        barColor = self._defaultBarColor;

                        if (self.getLabelColor(orderedData[i2].label)) {
                            barColor = self.getLabelColor(orderedData[i2].label);
                        } else if (self.getLabelColor(data[i].label)) {
                            barColor = self.getLabelColor(data[i].label);
                        }

                        ctx.fillStyle = barColor;
                        ctx.fillRect(
                            self.horizontalPixelPosition(i * (barWidth + barGutter) + barGutter),
                            verticalPos,
                            barWidth,
                            self.valueToPixels(orderedData[i2].value) * -1
                        );

                        verticalPos -= self.valueToPixels(orderedData[i2].value);

                    }
                }
            } else {
                barColor = self._defaultBarColor;

                if (self.getLabelColor(data[i].label)) {
                    barColor = self.getLabelColor(data[i].label);
                }


                ctx.fillStyle = barColor;
                ctx.fillRect(
                    self.horizontalPixelPosition(i * (barWidth + barGutter) + barGutter),
                    self.verticalPixelPosition(0),
                    barWidth,
                    self.valueToPixels(data[i].value) * -1
                );

                if (data[i].variance !== undefined) {
                    self.drawErrorBars((i * (barWidth + barGutter) + barGutter),(data[i].value),data[i].variance);
                }
            }
        }
    };

    self.drawErrorBars = function(xPos,yPos,variance,barCount) {
        if (typeof barCount === 'undefined') {
            barCount = 1; 
        }
        var ctx = self.context();
        var barWidth = self._barWidth / barCount;
        var barHeight = yPos;
        var errorVariance = (variance / 100) * barHeight;

        ctx.strokeStyle = self._defaultVarianceColor;
        ctx.lineWidth = 2;

        if ( yPos !== 0 ) {
            ctx.beginPath();
            // Vertical Line
            ctx.moveTo(self.horizontalPixelPosition(xPos + (barWidth / 2)), self.verticalPixelPosition((yPos) - errorVariance));
            ctx.lineTo(self.horizontalPixelPosition(xPos + (barWidth / 2)), self.verticalPixelPosition((yPos) + errorVariance));
            // Top Horizontal Line
            ctx.moveTo(self.horizontalPixelPosition(xPos + (barWidth * .65)),self.verticalPixelPosition((yPos) + errorVariance));
            ctx.lineTo(self.horizontalPixelPosition(xPos + (barWidth * .35)),self.verticalPixelPosition((yPos) + errorVariance));
            // Bottom Horizontal Line
            ctx.moveTo(self.horizontalPixelPosition(xPos + (barWidth * .65)),self.verticalPixelPosition((yPos) - errorVariance));
            ctx.lineTo(self.horizontalPixelPosition(xPos + (barWidth * .35)),self.verticalPixelPosition((yPos) - errorVariance));
            ctx.stroke();
            ctx.closePath();
        }

    };

    self.drawBarLabels = function() {
        var ctx = self.context();
        var barGutter = self._barGutter;
        var barWidth = self._barWidth;
        var data = self._data;
        var fontSize = self.getXAxisLabelFontSize();

        ctx.fillStyle = self._barLabelsColor;

        for (var i = 0, len = data.length; i < len; i ++) {
            ctx.save();
            ctx.translate(self.horizontalPixelPosition(i * (barWidth + barGutter) + barGutter + (barWidth / 2) + (fontSize / 4)), self.getChartHeight() + (fontSize * 2)  + self.getChartTitleHeight());
            ctx.rotate(-Math.PI/2);
            ctx.textAlign = 'right';
            ctx.fillText(data[i].label, 0, 0);
            ctx.restore();
        }
    };


    self.drawKey = function(keyData) {
        var ctx = self.context();
        var fontSize = self._fontSize;
        var maxCols = self.getKeyColumns(keyData);
        var yPos = self._height - self.getKeyHeight(keyData);
        var xPos;
        var col = 0;

        ctx.textAlign = 'left';
        ctx.font = fontSize + 'px ' + self._font;

        // draw line
        yPos += self._fontSize * 4;
        ctx.beginPath();
        ctx.moveTo(0, yPos - 0.5);
        ctx.lineTo(self._width, yPos - 0.5);
        ctx.strokeStyle = 'rgb(227,19,46)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3]);
        ctx.stroke();
        ctx.closePath();

        // draw key title
        yPos += self._fontSize * 1.6;
        ctx.fillStyle = 'rgb(112,111,112)';
        ctx.fillText('Key', 0, yPos);

        // draw key items
        yPos += self._fontSize * 1.6;

        for (var label in keyData) {
            if (keyData.hasOwnProperty(label)) {
                xPos = Math.round(col * (self._width / maxCols));
                ctx.fillStyle = keyData[label];
                ctx.fillRect(xPos, yPos, fontSize, fontSize);
                ctx.fillStyle = 'rgb(178,177,176)';
                ctx.fillText(label, xPos + 45, yPos + (fontSize * 0.9));

                col ++;

                if (col >= maxCols) {
                    col = 0;
                    yPos += fontSize * 1.6;
                }
            }
        }
    };


    self.drawRange = function(low, high, label, color) {
        var ctx = self.context();
        ctx.fillStyle = color || self._defaultRangeColor;
        ctx.fillRect(
            self.horizontalPixelPosition(0),
            self.verticalPixelPosition(low),
            self._width,
            self.valueToPixels(low - high)
        );

        if (label !== undefined) {
            ctx.font = self.font();
            ctx.textAlign = 'right';
            ctx.fillStyle = color || self._defaultRangeColor;
            ctx.fillText(label, self.getChartRightPos(), self.verticalPixelPosition(high) - (self._fontSize * 0.5));
        }
    };

    self.drawTarget = function(target, label, color) {
        var ctx = self.context();
        ctx.strokeStyle = color || self._defaultTargetColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3]);
        ctx.beginPath();
        ctx.moveTo(self.horizontalPixelPosition(0), self.verticalPixelPosition(target) - 0.5);
        ctx.lineTo(self.getChartRightPos(), self.verticalPixelPosition(target) - 0.5);
        ctx.stroke();
        ctx.closePath();
        ctx.setLineDash([1]);

        if (label !== undefined) {
            ctx.font = self.font();
            ctx.textAlign = 'right';
            ctx.fillStyle = color || self._defaultTargetColor;
            ctx.fillText(label, self.getChartRightPos(), self.verticalPixelPosition(target) - (self._fontSize * 0.5));
        }
    };

    self.chartLow = function() {
        if (self._chartLow === null) {
            var values = [];

            for (var i = 0, len = self._data.length; i < len; i ++) {
                values.push(self.barLow(self._data[i]));
            }

            self._chartLow = Math.min.apply(Math, values);
            self._chartLow = (self._chartLow < 0) ? self._chartLow : 0;
        }

        return self._chartLow;
    };


    self.chartHigh = function() {
        if (!self._chartHigh) {
            var values = [];

            for (var i = 0, len = self._data.length; i < len; i ++) {
                // if (self._data[i].variance !== undefined) {

                //  var errorVariance = (self._data[i].variance / 100) * self._data[i].value;
                //  self._data[i].value = self._data[i].value + errorVariance;

                //  values.push(self.barTotal(self._data[i]));

                // } else {
                values.push(self.barTotal(self._data[i]));
                // }
            }

            var maxValue = Math.max.apply(Math, values);
            self._chartHigh = maxValue + (~~(maxValue / 10));

        }

        return self._chartHigh;
    };


    /**
     * For stacked bars, returns the sum of all negative values,
     * otherwise returns zero.
     */
    self.barLow = function(bar) {
        if (!isNaN(bar.value)) {
            return bar.value;
        }

        var barLow = 0;

        for (var i = 0, len = bar.value.length; i < len; i ++) {
            if (bar.value[i].value < 0) {
                barLow += bar.value[i].value;
            }
        }

        return barLow;
    };


    /**
     * Returns the total value of the bar if positive, or zero
     */
    self.barHigh = function(bar) {
        return (self.barTotal(bar) > 0) ? self.barTotal(bar) : 0;
    };


    /**
     * Returns the sum of values in a bar
     */
    self.barTotal = function(bar) {
        if (!isNaN(bar.value)) {
            return bar.value;
        }

        var barTotal = 0;

        for (var i = 0, len = bar.value.length; i < len; i ++) {
            barTotal += bar.value[i].value;
        }

        return barTotal;
    };


    self.valueToPixels = function(value) {
        var chartRange = self.chartHigh() - self.chartLow();
        var valueAsPercentage = value / chartRange;
        var pixels = (self.getChartHeight() * valueAsPercentage);
        return Math.round(pixels);
    };


    self.verticalPixelOffset = function() {
        var offset = self.chartLow() * -1;
        var chartRange = self.chartHigh() - self.chartLow();
        var offsetAsPercentage = offset / chartRange;
        var pixelOffset = (self.getChartHeight() * offsetAsPercentage);
        return pixelOffset;
    };


    self.verticalPixelPosition = function(value) {
        return self.getChartBottomPos() - self.verticalPixelOffset() - self.valueToPixels(value);
    };


    self.getChartBottomPos = function() {
        return self._height - self.getBarLabelsHeight() - self.getKeyHeight(self._barColors);
    };


    self.getChartHeight = function() {
        return self.getChartBottomPos() - self.getChartTitleHeight();
    };


    self.getChartTitleHeight = function() {
        return (self._chartTitle) ? self._fontSize * 8 : self._fontSize * 0.5;
    };


    self.horizontalPixelPosition = function(chartPos) {
        return self.getChartLeftPos() + chartPos;
    };


    self.getChartWidth = function() {
        return self._width - self.getChartLeftPos();
    };


    self.getChartRightPos = function() {
        return self._width;
    };


    self.getChartLeftPos = function() {
        return self.getYAxisLabelWidth() + self.getYAxisScaleWidth();
    };


    self.getYAxisLabelWidth = function() {
        if (self._yAxisLabel) {
            return self._fontSize * 3.5;
        }

        return 0;
    };


    self.getYAxisScaleWidth = function() {
        if (self._division === 'auto') {
            var every = Math.floor(self.chartHigh() / 10);
        } else {
            var every = self._division;
        }

        var low = Math.ceil(self.chartLow() / every) * every;
        var high = self.chartHigh();
        var textArray = [];

        for (var i = low; i <= high; i += every) {
            textArray.push(i);
        }

        return self.widestText(textArray, self.font()) + (self._fontSize / 2);
    };


    self.getBarLabelsHeight = function() {
        var data = self._data;
        var fontSize = self.getXAxisLabelFontSize();
        var textArray = [];

        for (var i = 0, len = data.length; i < len; i ++) {
            textArray.push(data[i].label);
        }

        return self.widestText(textArray, self.font()) + (fontSize * 2);
    };

    self.getKeyHeight = function(keyData) {
        return (self.getKeyRows(keyData)) ? (self.getKeyRows(keyData) * self._fontSize * 1.6) + (self._fontSize * 7.2) : 0;
    };


    self.getKeyColumns = function(keyData) {
        var colWidth = self.widestText(self.getKeyTextAsArray(keyData), self.font()) + (self._fontSize * 2) + 45;
        return Math.floor(self._width / colWidth);
    };


    self.getKeyRows = function(keyData) {
        return Math.ceil(self.getKeyTextAsArray(keyData).length / self.getKeyColumns(keyData));
    };


    self.getKeyTextAsArray = function(keyData) {
        var textArray = [];

        for (var label in keyData) {
            if (keyData.hasOwnProperty(label)) {
                textArray.push(label);
            }
        }

        return textArray;
    };


    self.getXAxisLabelFontSize = function() {
        return self._fontSize;
    };


    let widestCache = {};

    self.widestText = function(textArray, font) {
        // This was a significant performance bottleneck.
        let cacheKey = JSON.stringify({ 'textArray': textArray, 'font': font });
        if (widestCache[cacheKey]) {
            return widestCache[cacheKey];
        }

        var cvs = document.createElement('canvas');
        cvs.width = 2000;
        cvs.height = 2000;
        var ctx = cvs.getContext('2d');
        ctx.font = font;

        let widths = textArray.map(str => ctx.measureText(str).width);
        let max = Math.max(...widths);

        widestCache[cacheKey] = max;
        return max;
    };


    self.font = function() {
        return self._fontSize + 'px ' + self._font;
    };


    self.getLabelColor = function(label) {
        return (self._barColors[label]) ? self._barColors[label] : null;
    };


    self.setHeight = function() {
        self._height = self._chartHeight + self.getChartTitleHeight() + self.getBarLabelsHeight() + self.getKeyHeight(self._barColors);
    };


    self.objectLength = function(obj) {
        var count = 0;

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                count ++;
            }
        }

        return count;
    };


    self.setHeight();

    if (!self._barWidth) {
        self._barWidth = ((self.getChartWidth() - self._barGutter) / self._data.length) - self._barGutter;
    }


    return self;
};
