using UnityEngine;
using System.Collections;

public class ParticleScript : MonoBehaviour {
    	public float duration = 5.0f;

	private IEnumerator Start()
	{
		yield return new WaitForSeconds(duration);
		Destroy(gameObject); 
	}
}
