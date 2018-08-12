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
		console.table(transactions);

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

		const template = document.createElement("template");
		template.innerHTML = `
			<div class="account__header">
				<div class="account__header__name">${account.name}</div>
				<div class="account__header__balance">$${account.balances.available != null ? account.balances.available : account.balances.current}</div>
			</div>
			<div class="account__body" style="display:none">
				<p>Spent this week:</p>
				<p><span class="account__spent" style="color:${color}">$${(Math.round(totalSpentThisWeek * 100) / 100).toLocaleString()}</span> / $${weeklyBudget}</p>
			</div>
		`;

		this.shadowRoot.appendChild(template.content.cloneNode(true));
		
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
			}

			.account__spent {
				font-size: 40px;
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
				font-size: 18px;
			}
			
			.account__header__balance {
				margin-left: auto;
				font-size: 17px;
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
		const body = this.shadowRoot.querySelector(".account__body");
		body.style.display = "";

		this.setAttribute("open", "");
		
		this.open = true;
	}

	closeCard()
	{
		const body = this.shadowRoot.querySelector(".account__body");
		body.style.display = "none";

		this.removeAttribute("open");
		
		this.open = false;
	}
}

customElements.define("account-card", AccountCardElement);