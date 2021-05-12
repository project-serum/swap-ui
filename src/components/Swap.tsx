import { Provider } from '@project-serum/anchor';
import { Swap as SwapClient } from '@project-serum/swap';
import { TokenListContainer } from '@solana/spl-token-registry';

export default function Swap({ provider, tokenList }: { provider: Provider; tokenList: TokenListContainer; }) {
	const client = new SwapClient(provider, tokenList);
	console.log('client', client);
	return (
		<div>
			Swapping
		</div>
	);
}
