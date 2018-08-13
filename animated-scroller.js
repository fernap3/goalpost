class AnimatedScroller
{
	ScrollToElement(scrollContainer, target, offset = 0)
	{
		const scrollTopInit = scrollContainer.scrollTop;
		const distance = target.offsetTop - scrollContainer.scrollTop - offset;
		const duration = 600; // in milliseconds

		let startTime = null;
		let bezier = new CubicBezier(0, .75, .95, 1);

		let doScroll = (timestamp) =>
		{
			startTime = startTime || timestamp;

			const t = Math.min(1, (timestamp - startTime) / duration);
			let newPosition = scrollTopInit + (bezier.Solve(t) * distance);

			scrollContainer.scrollTop = newPosition;

			if (t < 1)
				requestAnimationFrame(doScroll);
		}

		requestAnimationFrame(doScroll);
	}
}

class CubicBezier
{
	constructor(x0, y0, x1, y1)
	{
		this.x0 = x0;
		this.y0 = y0;
		this.x1 = x1;
		this.y1 = y1;
	}

	/** Returns the y-coordinate of the bezier curve at time t [0,1] */
	Solve(t)
	{
		if (t < 0 || t > 1)
			throw "t must be between 0 and 1 inclusive";
		
		return (this.x0 * ((1 - t) ** 3)) +
			   (3 * this.y0 * ((1 - t)**2) * t) + 
			   (3 * this.x1 * (1 - t) * (t**2)) + 
			   (this.y1 * (t**3));
	}
}