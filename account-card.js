class AccountCardElement extends HTMLElement
{
	constructor(account, transactions)
	{
		super();

		this.attachShadow({mode: "open"});

		const weeklyBudget = 500;
		const totalSpentThisWeek = transactions.reduce((prev, cur) => (cur.amount < 0 ? prev : prev + cur.amount), 0);

		console.log(`Stats for this week:`);
		console.log(`Total spent: ${totalSpentThisWeek}`);
		

		const budgetLeft = weeklyBudget - totalSpentThisWeek;
		const percentLeft = budgetLeft / weeklyBudget;
		const colorScale = 1 - (percentLeft * 5);
		let color;

		if (budgetLeft < 0)
			color = `var(--color-status-danger)`;
		else if (percentLeft > .2)
			color = `var(--color-status-ok)`;
		else
			color = `var(--color-status-warning)`;

		const spendingByDay = [[], [], [], [], [], [], []];
		transactions.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
		
		for (let t of transactions)
		{
			const d = new Date(t.date);

			if (t.amount > 0)
				spendingByDay[d.getDay()].push(t);
		}

		const summedSpendingByDay = spendingByDay.map(list => list.reduce((prev, cur) => prev + cur.amount, 0));
		const maxSpendingInOneDay = summedSpendingByDay.reduce((prev, cur) => cur > prev ? cur : prev, -1);

		
		console.table(spendingByDay);
		console.log(summedSpendingByDay);
		console.log("Max: ", maxSpendingInOneDay)

		const template = document.createElement("template");
		template.innerHTML = `
			<div class="account__header">
				<div class="account__header__name">${account.name}</div>
				<div class="account__header__balance">$${account.balances.available != null ? account.balances.available : account.balances.current}</div>
			</div>
			<div class="account__body" style="display:none">
				<p class="account__body__spendingtitle">Spent this week:</p>
				<p class="account__body_spending"><span class="account__spent" style="color:${color}">$${(Math.round(totalSpentThisWeek * 100) / 100).toLocaleString()}</span> / $${weeklyBudget}</p>
				<div class="account__body__histogram">
					${summedSpendingByDay.map(s => `<div class="account__body__histogram__bar" style="height:${(s/maxSpendingInOneDay)*100}%;background:${s > weeklyBudget/7 ? "var(--color-status-danger)" : s / (weeklyBudget/7) > .8 ? "var(--color-status-warning)" : "var(--color-status-ok)" }"></div>`).join("")}
					<div class="account__body__histogram__daylabel">Mon</div>
					<div class="account__body__histogram__daylabel">Tue</div>
					<div class="account__body__histogram__daylabel">Wed</div>
					<div class="account__body__histogram__daylabel">Thu</div>
					<div class="account__body__histogram__daylabel">Fri</div>
					<div class="account__body__histogram__daylabel">Sat</div>
					<div class="account__body__histogram__daylabel">Sun</div>
				</div>
			</div>
		`;

		this.shadowRoot.appendChild(template.content.cloneNode(true));


		const budgetLinePos = 100 - (((weeklyBudget / 7) / maxSpendingInOneDay) * 100);
		const budgetLine = document.createElement("div");
		budgetLine.className = "budget-line";
		budgetLine.style.top = `${budgetLinePos}px`;
		this.shadowRoot.querySelector(".account__body__histogram__bar").appendChild(budgetLine);


		
		const style = document.createElement("style");
		style.innerHTML = `
			:host {
				display: block;
				background: var(--color-paper);
				box-shadow: 0px 0px 2px 1px rgba(0, 0, 0, .15);
				border-radius: 4px;
				margin-bottom: 20px;
				width: 100%;
				max-width: 450px;
				box-sizing: border-box;
				font-size: 18px;
				overflow: hidden;
				transition: height .6s cubic-bezier(0.165, 0.84, 0.44, 1);
			}

			.account__spent {
				font-size: 2.22em;
				font-weight: 200;
			}
			
			.account__header {
				display: flex;
				align-items: center;
				padding: 1em;
				cursor: pointer;
			}

			.account__body {
				padding: 1em;
			}
			
			.account__header__name {
				
			}
			
			.account__header__balance {
				margin-left: auto;
			}

			.account__body__histogram {
				display: grid;
				grid-template-columns: repeat(7, 1fr);
				grid-template-rows: 100px;
				grid-column-gap: 10px;
				position: relative;
				margin-top: 2.6em;
			}

			.account__body__histogram__bar {
				border-radius: 3px;
				align-self: flex-end;
			}

			.account__body__histogram__daylabel {
				justify-self: center;
				font-size: .8em;
			}

			.budget-line {
				width: 100%;
				height: 2px;
				position: absolute;
				top: 0;
				left: 0;
				border-bottom: 2px dashed #222222;
			}

			.account__body__spendingtitle {
				text-align: center;
				margin-bottom: .2em;
			}

			.account__body_spending {
				text-align: center;
				margin-top: .2em;
			}
		`;
		this.shadowRoot.appendChild(style);

		const header = this.shadowRoot.querySelector(".account__header");
		header.addEventListener("click", evt => this.onHeaderClick());
	}

	onHeaderClick()
	{
		if (this.open)
			this.closeCard();
		else
			this.openCard();
	}

	openCard()
	{
		const header = this.shadowRoot.querySelector(".account__header");
		const body = this.shadowRoot.querySelector(".account__body");
		body.style.display = "";

		this.style.height = `${header.offsetHeight}px`;

		requestAnimationFrame(() => {
			this.style.height = `${header.offsetHeight + body.offsetHeight}px`;

			requestAnimationFrame(() => {
				new AnimatedScroller().ScrollToElement(document.body, header);
			});
		});

		this.setAttribute("open", "");
		
		this.open = true;
	}

	closeCard()
	{
		const header = this.shadowRoot.querySelector(".account__header");
		const body = this.shadowRoot.querySelector(".account__body");
		body.style.display = "";

		this.style.height = `${header.offsetHeight + body.offsetHeight}px`;

		requestAnimationFrame(() => {
			this.style.height = `${header.offsetHeight}px`;

			requestAnimationFrame(() => {
				new AnimatedScroller().ScrollToElement(document.body, header);
			});
		});

		this.removeAttribute("open");
		
		this.open = false;
	}
}

customElements.define("account-card", AccountCardElement);